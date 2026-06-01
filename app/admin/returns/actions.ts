"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { notifyReturnReceived, notifyReturnRefunded, notifyReturnRejected } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "admin") throw new Error("Admin only.");
}

type ReturnRow = {
  id: string;
  rma_number: string;
  order_id: string;
  customer_id: string;
  status: string;
  reason: string;
  refund_amount: number | null;
};

async function loadReturn(id: string): Promise<{ ret: ReturnRow; customerEmail: string }> {
  const admin = getAdminSupabase();
  const { data: ret } = await admin.from("returns").select("*").eq("id", id).maybeSingle();
  if (!ret) throw new Error("Return not found.");
  const { data: order } = await admin.from("orders").select("customer_email").eq("id", ret.order_id).maybeSingle();
  return { ret: ret as ReturnRow, customerEmail: order?.customer_email ?? "" };
}

async function rebuildItemsLabel(returnId: string): Promise<string> {
  const admin = getAdminSupabase();
  const { data: items } = await admin
    .from("return_items")
    .select("qty, order_items:order_item_id(name, colour, size)")
    .eq("return_id", returnId);
  type Row = { qty: number; order_items: { name: string; colour: string | null; size: string } | null };
  return ((items as unknown as Row[]) ?? [])
    .map(i => `  ${i.qty}× ${i.order_items?.name ?? "—"}${i.order_items?.colour ? ` (${i.order_items.colour})` : ""} · size ${i.order_items?.size ?? "—"}`)
    .join("\n");
}

// ─── Mark as received at the hub ────────────────────────────────────────────
export async function markReturnReceived(id: string) {
  await requireAdmin();
  const admin = getAdminSupabase();
  const { ret, customerEmail } = await loadReturn(id);
  if (ret.status !== "requested" && ret.status !== "approved") {
    throw new Error(`Can't mark received: status is "${ret.status}".`);
  }

  await admin
    .from("returns")
    .update({ status: "received", received_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (customerEmail) {
    await notifyReturnReceived({
      rmaNumber: ret.rma_number,
      orderId: ret.order_id,
      customerEmail,
      reason: ret.reason,
      itemsLabel: await rebuildItemsLabel(id),
    });
  }

  await logAction({
    action: "return.received",
    targetType: "return",
    targetId: id,
    metadata: { rma: ret.rma_number, order_id: ret.order_id },
  });

  revalidatePath("/admin/returns");
  revalidatePath(`/admin/returns/${id}`);
}

// ─── Approve + refund via Stripe + restock ──────────────────────────────────
export async function approveReturnRefund(id: string) {
  await requireAdmin();
  if (!isStripeConfigured()) throw new Error("Stripe is not configured.");
  const admin = getAdminSupabase();
  const { ret, customerEmail } = await loadReturn(id);
  if (ret.status === "refunded") throw new Error("Already refunded.");
  if (ret.status !== "received" && ret.status !== "approved") {
    throw new Error(`Can't refund: status is "${ret.status}". Mark received first.`);
  }

  // 1. Compute refund amount from return_items × order_items.unit_price
  const { data: items } = await admin
    .from("return_items")
    .select("qty, order_item_id, order_items:order_item_id(unit_price, product_slug, colour, size)")
    .eq("return_id", id);
  type Row = { qty: number; order_item_id: string; order_items: { unit_price: number; product_slug: string; colour: string | null; size: string } | null };
  const rows = (items as unknown as Row[]) ?? [];
  const refundAmount = rows.reduce((sum, i) => sum + (i.order_items?.unit_price ?? 0) * i.qty, 0); // GBP

  // 2. Look up the original payment_intent
  const { data: order } = await admin
    .from("orders")
    .select("stripe_payment_intent_id, currency, total, status")
    .eq("id", ret.order_id)
    .maybeSingle();
  if (!order?.stripe_payment_intent_id) throw new Error("Order has no Stripe payment intent — can't refund automatically.");

  // 3. Stripe refund (amounts in minor units)
  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: order.stripe_payment_intent_id,
    amount: Math.round(refundAmount * 100),
    metadata: { return_id: id, rma_number: ret.rma_number },
  });

  // 4. Mark order refunded BEFORE the webhook arrives so the webhook short-circuits
  //    and doesn't double-restock everything.
  await admin
    .from("orders")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", ret.order_id);

  // 5. Restock granularly for just the returned items
  for (const r of rows) {
    if (!r.order_items) continue;
    await admin.rpc("increment_stock", {
      p_slug:   r.order_items.product_slug,
      p_colour: r.order_items.colour ?? "",
      p_size:   r.order_items.size,
      p_qty:    r.qty,
    });
  }

  // 6. Mark the return refunded
  await admin
    .from("returns")
    .update({
      status: "refunded",
      refund_amount: refundAmount,
      refund_currency: order.currency || "GBP",
      stripe_refund_id: refund.id,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // 7. Notify
  if (customerEmail) {
    await notifyReturnRefunded({
      rmaNumber: ret.rma_number,
      orderId: ret.order_id,
      customerEmail,
      reason: ret.reason,
      itemsLabel: await rebuildItemsLabel(id),
      refundAmount,
    });
  }

  await logAction({
    action: "return.refund_approved",
    targetType: "return",
    targetId: id,
    metadata: {
      rma: ret.rma_number,
      order_id: ret.order_id,
      refund_amount: refundAmount,
      stripe_refund_id: refund.id,
    },
  });

  revalidatePath("/admin/returns");
  revalidatePath(`/admin/returns/${id}`);
  revalidatePath(`/account/orders/${ret.order_id}`);
}

// ─── Reject the return ──────────────────────────────────────────────────────
export async function rejectReturn(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const rejectionReason = String(formData.get("rejection_reason") || "").trim();
  if (!id || !rejectionReason) throw new Error("Missing id or rejection reason.");

  const admin = getAdminSupabase();
  const { ret, customerEmail } = await loadReturn(id);
  if (ret.status === "refunded") throw new Error("Already refunded — can't reject.");

  await admin
    .from("returns")
    .update({
      status: "rejected",
      admin_note: rejectionReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (customerEmail) {
    await notifyReturnRejected({
      rmaNumber: ret.rma_number,
      orderId: ret.order_id,
      customerEmail,
      reason: ret.reason,
      itemsLabel: await rebuildItemsLabel(id),
      rejectionReason,
    });
  }

  await logAction({
    action: "return.rejected",
    targetType: "return",
    targetId: id,
    metadata: { rma: ret.rma_number, order_id: ret.order_id, rejection_reason: rejectionReason },
  });

  revalidatePath("/admin/returns");
  revalidatePath(`/admin/returns/${id}`);
}
