"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  notifyOrderDelivered,
  notifyOrderDispatched,
  notifyOrderPacked,
} from "@/lib/notifications";
import { logAction } from "@/lib/audit";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin role required.");
}

export async function setOrderStatus(id: string, status: "paid" | "packed" | "dispatched" | "delivered" | "cancelled") {
  await requireAdmin();
  const sb = getAdminSupabase();
  const now = new Date().toISOString();

  const stamp: Record<string, string> = { updated_at: now };
  if (status === "paid")       stamp.paid_at       = now;
  if (status === "packed")     stamp.packed_at     = now;
  if (status === "dispatched") stamp.dispatched_at = now;
  if (status === "delivered")  stamp.delivered_at  = now;
  if (status === "cancelled")  stamp.cancelled_at  = now;

  // Capture previous status so the audit log shows the transition
  const { data: before } = await sb.from("orders").select("status").eq("id", id).maybeSingle();

  const { data: order, error } = await sb
    .from("orders")
    .update({ status, ...stamp })
    .eq("id", id)
    .select("id, customer_email")
    .single();
  if (error) throw new Error(error.message);

  if (order?.customer_email) {
    if (status === "packed")     await notifyOrderPacked({ id: order.id, customer_email: order.customer_email });
    if (status === "dispatched") await notifyOrderDispatched({ id: order.id, customer_email: order.customer_email });
    if (status === "delivered")  await notifyOrderDelivered({ id: order.id, customer_email: order.customer_email });
  }

  await logAction({
    action: "order.status_changed",
    targetType: "order",
    targetId: id,
    metadata: { from: before?.status ?? null, to: status },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath(`/account/orders/${id}`);
}

/**
 * Dispatch with courier metadata in one step — flips status to "dispatched",
 * stores courier + tracking ref (and an optional override URL), computes the
 * customer-facing ETA, and emails the customer.
 */
export async function dispatchOrder(formData: FormData) {
  await requireAdmin();
  const id           = String(formData.get("id") || "");
  const courier      = String(formData.get("courier") || "").trim();
  const trackingRef  = String(formData.get("tracking_ref") || "").trim();
  const trackingUrl  = String(formData.get("tracking_url") || "").trim() || null;
  const etaDays      = Number(formData.get("eta_days") || 3);
  if (!id || !courier || !trackingRef) throw new Error("Order id, courier, and tracking ref are required.");

  const now = new Date();
  const eta = new Date(now.getTime() + etaDays * 86_400_000).toISOString().slice(0, 10);

  const sb = getAdminSupabase();
  const { data: order, error } = await sb
    .from("orders")
    .update({
      status: "dispatched",
      courier,
      tracking_ref: trackingRef,
      tracking_url: trackingUrl,
      eta_date: eta,
      dispatched_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", id)
    .select("id, customer_email")
    .single();
  if (error) throw new Error(error.message);

  if (order?.customer_email) {
    await notifyOrderDispatched({ id: order.id, customer_email: order.customer_email });
  }

  await logAction({
    action: "order.dispatched",
    targetType: "order",
    targetId: id,
    metadata: { courier, tracking_ref: trackingRef, eta_date: eta },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath(`/account/orders/${id}`);
}
