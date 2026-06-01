"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { notifyOrderCancelled } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

/**
 * Customer-initiated cancellation. Eligibility: caller owns the order AND
 * status is exactly "paid" (not yet packed/dispatched/delivered). Triggers
 * a full Stripe refund of the original payment intent, marks the order
 * cancelled, restocks granularly, and notifies both customer + admin.
 *
 * Ordering matters: status is set to "cancelled" BEFORE the Stripe refund
 * fires, so the existing charge.refunded webhook short-circuits and doesn't
 * double-restock.
 */
export async function cancelOrder(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const reason  = String(formData.get("reason") || "").trim() || undefined;

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Please sign in.");

  // Ownership + eligibility
  const { data: order } = await sb
    .from("orders")
    .select("id, customer_id, customer_email, status, total, currency, stripe_payment_intent_id, order_items(product_slug, colour, size, qty)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order)                       throw new Error("Order not found.");
  if (order.customer_id !== user.id) throw new Error("Not your order.");
  if (order.status !== "paid") {
    throw new Error(`Cancellation is only available while the order is in "paid" state. Current status: ${order.status}.`);
  }
  if (!order.stripe_payment_intent_id) {
    throw new Error("No Stripe payment intent on file — please write to correspondence@theasofe.com.");
  }
  if (!isStripeConfigured()) {
    throw new Error("Refunds are temporarily unavailable. Please write to correspondence@theasofe.com.");
  }

  const admin = getAdminSupabase();

  // 1. Set cancelled BEFORE the refund so the webhook short-circuits
  const now = new Date().toISOString();
  await admin
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: now,
      notes: reason ? `Cancelled by customer: ${reason}` : "Cancelled by customer",
      updated_at: now,
    })
    .eq("id", orderId);

  // 2. Granular stock restoration
  for (const item of order.order_items ?? []) {
    await admin.rpc("increment_stock", {
      p_slug:   item.product_slug,
      p_colour: item.colour ?? "",
      p_size:   item.size,
      p_qty:    item.qty,
    });
  }

  // 3. Stripe full refund
  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: order.stripe_payment_intent_id,
    metadata: { reason: reason ?? "customer_cancellation", order_id: orderId },
  });

  // 4. Notify
  await notifyOrderCancelled({
    orderId,
    customerEmail: order.customer_email,
    refundAmount: order.total,
    reason,
  });

  // 5. Audit
  await logAction({
    action: "order.cancelled_by_customer",
    targetType: "order",
    targetId: orderId,
    metadata: {
      refund_amount: order.total,
      stripe_refund_id: refund.id,
      reason,
    },
  });

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/account/orders/${orderId}?cancelled=1`);
}
