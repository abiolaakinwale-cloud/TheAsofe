"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { logAction } from "@/lib/audit";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin only.");
}

const VALID_INCOTERMS = new Set(["DDP", "DAP", "EXW", "FOB", "CIF"]);

function toInt(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function toGbpPence(v: FormDataEntryValue | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function toIso2(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim().toUpperCase();
  if (!s) return null;
  if (!/^[A-Z]{2}$/.test(s)) return null;
  return s;
}

export async function saveCustomsMetadata(formData: FormData) {
  await requireAdmin();
  const shipmentId = String(formData.get("shipmentId") || "");
  if (!shipmentId) throw new Error("Missing shipment id.");

  const admin = getAdminSupabase();

  // ─── Shipment-level fields ───────────────────────────────────────────
  const incoterm          = String(formData.get("incoterm") || "DDP").trim().toUpperCase();
  if (!VALID_INCOTERMS.has(incoterm)) throw new Error("Invalid incoterm.");
  const consignorAddress  = String(formData.get("consignor_address") || "").trim() || null;
  const commercialPurpose = String(formData.get("commercial_purpose") || "").trim() || "Sale of goods";
  const invoiceNumber     = String(formData.get("invoice_number") || "").trim() || null;

  const { error: shipErr } = await admin
    .from("shipments")
    .update({
      incoterm,
      consignor_address: consignorAddress,
      commercial_purpose: commercialPurpose,
      invoice_number: invoiceNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shipmentId);
  if (shipErr) throw new Error(shipErr.message);

  // ─── Per-line item fields ────────────────────────────────────────────
  // Form names: hs__<itemId>, value__<itemId>, origin__<itemId>, weight__<itemId>, desc__<itemId>
  const itemIds = new Set<string>();
  for (const k of formData.keys()) {
    const m = /^(?:hs|value|origin|weight|desc)__(.+)$/.exec(k);
    if (m) itemIds.add(m[1]);
  }

  let updated = 0;
  for (const itemId of itemIds) {
    const patch = {
      hs_code:             String(formData.get(`hs__${itemId}`) || "").trim() || null,
      declared_unit_value: toGbpPence(formData.get(`value__${itemId}`)),
      country_of_origin:   toIso2(formData.get(`origin__${itemId}`)),
      weight_grams:        toInt(formData.get(`weight__${itemId}`)),
      customs_description: String(formData.get(`desc__${itemId}`) || "").trim() || null,
    };
    const { error } = await admin.from("shipment_items").update(patch).eq("id", itemId);
    if (!error) updated++;
  }

  await logAction({
    action: "shipment.customs_updated",
    targetType: "shipment",
    targetId: shipmentId,
    metadata: { incoterm, items_updated: updated },
  });

  revalidatePath(`/admin/shipments/${shipmentId}`);
  revalidatePath(`/admin/shipments/${shipmentId}/customs`);
  redirect(`/admin/shipments/${shipmentId}/customs?saved=1`);
}
