"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyShipmentArrived, notifyShipmentInducted } from "@/lib/notifications";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin role required.");
}

const get = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

type Status = "awaiting_dispatch" | "in_transit" | "customs" | "arrived" | "inducted" | "cancelled";

export async function createShipment(formData: FormData) {
  await requireAdmin();
  const brand = get(formData, "brand");
  const freight = get(formData, "freight_partner") || null;
  const trackingRef = get(formData, "tracking_ref") || null;
  const expected = get(formData, "expected_arrival") || null;
  const notes = get(formData, "notes") || null;

  if (!brand) throw new Error("Brand is required.");

  const sb = getAdminSupabase();
  const { data, error } = await sb.from("shipments").insert({
    brand,
    freight_partner: freight,
    tracking_ref: trackingRef,
    expected_arrival: expected,
    notes,
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Insert failed.");

  revalidatePath("/admin/shipments");
  redirect(`/admin/shipments/${data.id}`);
}

export async function addShipmentItem(shipmentId: string, formData: FormData) {
  await requireAdmin();
  const product = get(formData, "product_slug");
  const size = get(formData, "size");
  const qtyStr = get(formData, "qty");
  const qty = parseInt(qtyStr, 10);

  if (!product || !size) throw new Error("Product and size are required.");
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("Quantity must be a positive whole number.");

  const sb = getAdminSupabase();
  const { error } = await sb.from("shipment_items").insert({
    shipment_id: shipmentId,
    product_slug: product,
    size,
    qty,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/shipments/${shipmentId}`);
}

export async function removeShipmentItem(shipmentId: string, itemId: string) {
  await requireAdmin();
  const sb = getAdminSupabase();
  const { error } = await sb.from("shipment_items").delete().eq("id", itemId).eq("shipment_id", shipmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/shipments/${shipmentId}`);
}

export async function setShipmentStatus(id: string, status: Status) {
  await requireAdmin();
  const sb = getAdminSupabase();
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "arrived") update.received_at = new Date().toISOString();

  const { data: shipment, error } = await sb
    .from("shipments")
    .update(update)
    .eq("id", id)
    .select("id, brand")
    .single();
  if (error || !shipment) throw new Error(error?.message ?? "Update failed.");

  if (status === "arrived") {
    const seller = await sellerEmailForBrand(shipment.brand);
    if (seller) await notifyShipmentArrived({ sellerEmail: seller, shipmentId: shipment.id });
  }

  revalidatePath("/admin/shipments");
  revalidatePath(`/admin/shipments/${id}`);
  revalidatePath("/dashboard/shipments");
}

// Mark each line's received_qty (from the form), increment stock_levels by that
// amount per (product, size), and move the shipment to 'inducted'.
export async function inductShipment(id: string, formData: FormData) {
  await requireAdmin();
  const sb = getAdminSupabase();

  const { data: shipment, error: sErr } = await sb
    .from("shipments")
    .select("id, brand, status")
    .eq("id", id)
    .maybeSingle();
  if (sErr || !shipment) throw new Error("Shipment not found.");
  if (shipment.status === "inducted") throw new Error("Shipment is already inducted.");

  const { data: items } = await sb
    .from("shipment_items")
    .select("id, product_slug, size, qty")
    .eq("shipment_id", id);

  for (const it of items ?? []) {
    const raw = formData.get(`received__${it.id}`);
    const n = Number(raw);
    const received = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;

    // Persist received_qty on the line
    await sb.from("shipment_items").update({ received_qty: received }).eq("id", it.id);

    if (received > 0) {
      // Ensure a stock row exists, then increment
      await sb.from("stock_levels").upsert(
        { product_slug: it.product_slug, size: it.size, quantity: 0, updated_at: new Date().toISOString() },
        { onConflict: "product_slug,size", ignoreDuplicates: true }
      );
      await sb.rpc("increment_stock", {
        p_slug: it.product_slug,
        p_size: it.size,
        p_qty: received,
      });
    }
  }

  await sb.from("shipments").update({
    status: "inducted",
    received_at: shipment.status === "arrived" ? undefined : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  const seller = await sellerEmailForBrand(shipment.brand);
  if (seller) {
    const totalInducted = (items ?? []).reduce((sum, it) => {
      const raw = formData.get(`received__${it.id}`);
      const n = Number(raw);
      return sum + (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
    }, 0);
    await notifyShipmentInducted({
      sellerEmail: seller,
      shipmentId: shipment.id,
      itemsInducted: totalInducted,
    });
  }

  revalidatePath("/admin/shipments");
  revalidatePath(`/admin/shipments/${id}`);
  revalidatePath("/dashboard/shipments");
}

async function sellerEmailForBrand(brand: string): Promise<string | null> {
  const sb = getAdminSupabase();
  const { data } = await sb
    .from("profiles")
    .select("email")
    .eq("brand", brand)
    .eq("role", "seller")
    .maybeSingle();
  return data?.email ?? null;
}
