"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyReturnRequested } from "@/lib/notifications";

const RETURN_WINDOW_DAYS = 7;

const VALID_REASONS = [
  "sizing", "quality", "not_as_described", "arrived_damaged",
  "wrong_item", "changed_mind", "other",
] as const;

function rma(): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let s = "R-";
  for (let i = 0; i < 6; i++) s += alpha[bytes[i] % alpha.length];
  return s;
}

export type RequestReturnInput = {
  orderId: string;
  reason: string;
  customerNote?: string;
  items: Array<{ orderItemId: string; qty: number }>;
};

export type RequestReturnResult =
  | { ok: true; returnId: string; rmaNumber: string }
  | { ok: false; error: string };

export async function requestReturn(input: RequestReturnInput): Promise<RequestReturnResult> {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to request a return." };

  if (!VALID_REASONS.includes(input.reason as typeof VALID_REASONS[number])) {
    return { ok: false, error: "Invalid reason." };
  }
  if (!input.items.length) return { ok: false, error: "Pick at least one item to return." };

  // 1. Verify order is owned + delivered + within window
  const { data: order } = await sb
    .from("orders")
    .select("id, customer_id, status, total, currency, customer_email, created_at, updated_at")
    .eq("id", input.orderId)
    .maybeSingle();
  if (!order)                       return { ok: false, error: "Order not found." };
  if (order.customer_id !== user.id) return { ok: false, error: "Not your order." };
  if (order.status !== "delivered" && order.status !== "dispatched") {
    return { ok: false, error: "Returns are available once the order is dispatched." };
  }

  const ageDays = (Date.now() - new Date(order.updated_at).getTime()) / 86_400_000;
  if (ageDays > RETURN_WINDOW_DAYS) {
    return { ok: false, error: `The ${RETURN_WINDOW_DAYS}-day return window has closed for this order.` };
  }

  // 2. No existing live return for this order
  const { data: existing } = await sb
    .from("returns")
    .select("id, status")
    .eq("order_id", input.orderId)
    .in("status", ["requested", "approved", "received"])
    .maybeSingle();
  if (existing) return { ok: false, error: "A return for this order is already in progress." };

  // 3. Validate qty against order_items
  const admin = getAdminSupabase();
  const { data: orderItems } = await admin
    .from("order_items")
    .select("id, name, colour, size, qty, unit_price, product_slug, brand_slug")
    .eq("order_id", input.orderId);
  if (!orderItems?.length) return { ok: false, error: "No items found on this order." };

  const orderItemsById = new Map(orderItems.map(i => [i.id, i]));
  for (const r of input.items) {
    const oi = orderItemsById.get(r.orderItemId);
    if (!oi)                return { ok: false, error: "An item on the return doesn't belong to this order." };
    if (r.qty <= 0)         return { ok: false, error: "Return qty must be positive." };
    if (r.qty > oi.qty)     return { ok: false, error: `You only purchased ${oi.qty} × ${oi.name}; can't return ${r.qty}.` };
  }

  // 4. Create the return + items
  const rmaNumber = rma();
  const { data: created, error: insertErr } = await sb
    .from("returns")
    .insert({
      order_id:      input.orderId,
      customer_id:   user.id,
      rma_number:    rmaNumber,
      status:        "requested",
      reason:        input.reason,
      customer_note: input.customerNote || null,
    })
    .select("id")
    .single();
  if (insertErr || !created) return { ok: false, error: insertErr?.message ?? "Could not create return." };

  // Insert items via service role so we don't fight RLS on a join lookup
  const { error: itemsErr } = await admin
    .from("return_items")
    .insert(input.items.map(r => ({
      return_id:     created.id,
      order_item_id: r.orderItemId,
      qty:           r.qty,
    })));
  if (itemsErr) {
    // Roll back the parent so we don't leave a hollow return
    await admin.from("returns").delete().eq("id", created.id);
    return { ok: false, error: itemsErr.message };
  }

  // 5. Notify
  const itemsLabel = input.items
    .map(r => {
      const oi = orderItemsById.get(r.orderItemId)!;
      return `  ${r.qty}× ${oi.name}${oi.colour ? ` (${oi.colour})` : ""} · size ${oi.size}`;
    })
    .join("\n");

  await notifyReturnRequested({
    rmaNumber,
    orderId:       input.orderId,
    customerEmail: order.customer_email ?? user.email ?? "",
    reason:        input.reason,
    itemsLabel,
  });

  revalidatePath(`/account/orders/${input.orderId}`);
  revalidatePath("/account/returns");
  return { ok: true, returnId: created.id, rmaNumber };
}

export async function submitReturnForm(formData: FormData) {
  const orderId      = String(formData.get("orderId") || "");
  const reason       = String(formData.get("reason") || "");
  const customerNote = String(formData.get("customerNote") || "").trim() || undefined;

  const items: Array<{ orderItemId: string; qty: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty__")) continue;
    const qty = Number(value);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const orderItemId = key.slice("qty__".length);
    items.push({ orderItemId, qty });
  }

  const r = await requestReturn({ orderId, reason, customerNote, items });
  if (r.ok) redirect(`/account/returns/${r.returnId}?new=1`);
  redirect(`/account/orders/${orderId}/return?error=${encodeURIComponent(r.error)}`);
}
