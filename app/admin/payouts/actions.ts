"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { previewPayout } from "@/lib/payouts";
import { notifyPayoutStatement, notifyPayoutPaid } from "@/lib/notifications";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "admin") throw new Error("Admin only.");
}

export async function generatePayout(formData: FormData) {
  await requireAdmin();
  const brand       = String(formData.get("brand") || "").trim();
  const periodStart = String(formData.get("period_start") || "").trim();
  const periodEnd   = String(formData.get("period_end") || "").trim();

  if (!brand || !periodStart || !periodEnd) throw new Error("Brand and period are required.");
  if (periodEnd < periodStart) throw new Error("Period end must be after period start.");

  const preview = await previewPayout(brand, periodStart, periodEnd);
  if (preview.lines.length === 0) throw new Error(`Nothing to pay out for ${brand} in this period.`);

  const admin = getAdminSupabase();

  // Guard: don't double-generate for the same brand × period (draft or sent)
  const { data: existing } = await admin
    .from("payouts")
    .select("id, status")
    .eq("brand", brand)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .in("status", ["draft", "sent"])
    .maybeSingle();
  if (existing) throw new Error(`A ${existing.status} payout for ${brand} ${periodStart}–${periodEnd} already exists.`);

  // Create payout header
  const { data: payout, error } = await admin
    .from("payouts")
    .insert({
      brand,
      status: "draft",
      period_start: periodStart,
      period_end: periodEnd,
      gross_total:       preview.gross,
      refund_total:      preview.refunds,
      commission_amount: preview.commission,
      net_amount:        preview.net,
    })
    .select("id")
    .single();
  if (error || !payout) throw new Error(error?.message ?? "Could not create payout.");

  // Insert lines
  const { error: linesErr } = await admin.from("payout_lines").insert(
    preview.lines.map(l => ({
      payout_id:        payout.id,
      order_id:         l.order_id,
      order_item_id:    l.order_item_id,
      product_slug:     l.product_slug,
      product_name:     l.product_name,
      qty:              l.qty,
      unit_price:       l.unit_price,
      gross_amount:     l.gross_amount,
      refund_amount:    l.refund_amount,
      commission_rate:  l.commission_rate,
      net_amount:       l.net_amount,
    }))
  );
  if (linesErr) {
    await admin.from("payouts").delete().eq("id", payout.id);
    throw new Error(linesErr.message);
  }

  revalidatePath("/admin/payouts");
  redirect(`/admin/payouts/${payout.id}`);
}

export async function sendPayoutStatement(id: string) {
  await requireAdmin();
  const admin = getAdminSupabase();

  const { data: payout } = await admin
    .from("payouts")
    .select("*, brands:brand(name)")
    .eq("id", id)
    .maybeSingle();
  if (!payout) throw new Error("Payout not found.");
  if (payout.status !== "draft") throw new Error(`Can't send: status is "${payout.status}".`);

  const { data: seller } = await admin
    .from("profiles")
    .select("email")
    .eq("brand", payout.brand)
    .eq("role", "seller")
    .maybeSingle();

  if (seller?.email) {
    await notifyPayoutStatement({
      sellerEmail: seller.email,
      brandName: (payout.brands as { name: string } | null)?.name ?? payout.brand,
      periodStart: payout.period_start,
      periodEnd: payout.period_end,
      gross: payout.gross_total,
      refunds: payout.refund_total,
      commission: payout.commission_amount,
      net: payout.net_amount,
      payoutId: id,
    });
  }

  await admin
    .from("payouts")
    .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/payouts/${id}`);
}

export async function markPayoutPaid(formData: FormData) {
  await requireAdmin();
  const id      = String(formData.get("id") || "");
  const paidVia = String(formData.get("paid_via") || "").trim();
  const paidRef = String(formData.get("paid_ref") || "").trim();
  const notes   = String(formData.get("notes") || "").trim() || null;
  if (!id || !paidVia || !paidRef) throw new Error("ID, method, and reference are required.");

  const admin = getAdminSupabase();
  const { data: payout } = await admin
    .from("payouts")
    .select("*, brands:brand(name)")
    .eq("id", id)
    .maybeSingle();
  if (!payout) throw new Error("Payout not found.");
  if (payout.status === "paid") throw new Error("Already marked paid.");
  if (payout.status === "cancelled") throw new Error("Cancelled payouts can't be marked paid.");

  await admin
    .from("payouts")
    .update({
      status: "paid",
      paid_via: paidVia,
      paid_ref: paidRef,
      paid_at: new Date().toISOString(),
      notes: notes ?? payout.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  const { data: seller } = await admin
    .from("profiles")
    .select("email")
    .eq("brand", payout.brand)
    .eq("role", "seller")
    .maybeSingle();

  if (seller?.email) {
    await notifyPayoutPaid({
      sellerEmail: seller.email,
      brandName: (payout.brands as { name: string } | null)?.name ?? payout.brand,
      net: payout.net_amount,
      paidVia,
      paidRef,
      payoutId: id,
    });
  }

  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/payouts/${id}`);
  revalidatePath("/dashboard/payouts");
}

export async function cancelPayout(id: string) {
  await requireAdmin();
  const admin = getAdminSupabase();
  const { data: payout } = await admin.from("payouts").select("status").eq("id", id).maybeSingle();
  if (!payout) throw new Error("Payout not found.");
  if (payout.status === "paid") throw new Error("Can't cancel a paid payout.");

  await admin
    .from("payouts")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/payouts/${id}`);
}
