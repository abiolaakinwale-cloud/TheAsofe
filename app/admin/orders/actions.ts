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
import { getCourierProvider } from "@/lib/courier";
import { UK_HUB_ADDRESS, DEFAULT_PARCEL } from "@/lib/courier/hub";

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

/**
 * Buy an outbound shipping label for an order via the configured courier
 * provider (Shippo when SHIPPO_API_TOKEN is set, stub otherwise). Stamps
 * the label fields on the order and pre-fills courier + tracking_ref so
 * the existing dispatchOrder flow can flip status to dispatched with one
 * more click.
 *
 * Doesn't change order.status — that's deliberate so the admin can review
 * the label before notifying the customer.
 */
export async function buyShippingLabel(id: string) {
  await requireAdmin();
  const sb = getAdminSupabase();

  const { data: order } = await sb
    .from("orders")
    .select("id, customer_email, shipping_address_id, status, label_url, addresses:shipping_address_id(full_name, line1, line2, city, postcode, country, phone)")
    .eq("id", id)
    .maybeSingle();
  if (!order) throw new Error("Order not found.");
  if (!order.shipping_address_id) throw new Error("No shipping address on the order — can't generate label.");
  if (order.label_url) throw new Error("A label has already been issued for this order.");
  if (order.status !== "paid" && order.status !== "packed") {
    throw new Error(`Label generation only available for paid or packed orders (current: ${order.status}).`);
  }

  type AddressRow = { full_name: string; line1: string; line2: string | null; city: string; postcode: string; country: string; phone: string | null };
  const addressRaw = order.addresses as unknown as AddressRow | AddressRow[] | null;
  const addr: AddressRow | null = Array.isArray(addressRaw) ? addressRaw[0] ?? null : addressRaw;
  if (!addr) throw new Error("Shipping address row missing.");

  const provider = getCourierProvider();
  const result = await provider.buyLabel({
    orderId: id,
    reference: id.slice(0, 8).toUpperCase(),
    from: UK_HUB_ADDRESS,
    to: {
      name: addr.full_name,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      postcode: addr.postcode,
      country: addr.country,
      phone: addr.phone,
      email: order.customer_email,
    },
    parcel: DEFAULT_PARCEL,
    serviceLevel: "tracked_48",
  });

  await sb
    .from("orders")
    .update({
      label_url: result.labelUrl,
      label_provider: result.provider,
      label_parcel_id: result.parcelId,
      label_cost_pence: result.costPence,
      label_created_at: new Date().toISOString(),
      courier: result.courier,
      tracking_ref: result.trackingRef,
      tracking_url: result.trackingUrl,
      eta_date: result.etaDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logAction({
    action: "order.label_purchased",
    targetType: "order",
    targetId: id,
    metadata: {
      provider: result.provider,
      courier: result.courier,
      tracking_ref: result.trackingRef,
      cost_pence: result.costPence,
    },
  });

  revalidatePath(`/admin/orders/${id}`);
}
