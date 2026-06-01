"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyGiftCardIssued } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin only.");
}

export async function cancelGiftCard(formData: FormData) {
  await requireAdmin();
  const id     = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim() || null;
  if (!id) throw new Error("Missing card id.");

  const admin = getAdminSupabase();
  const { data: card } = await admin.from("gift_cards").select("status").eq("id", id).maybeSingle();
  if (!card) throw new Error("Card not found.");
  if (card.status === "cancelled")      throw new Error("Already cancelled.");
  if (card.status === "fully_redeemed") throw new Error("Card is fully redeemed — nothing to cancel.");

  await admin
    .from("gift_cards")
    .update({
      status: "cancelled",
      balance_pence: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logAction({
    action: "gift_card.cancelled",
    targetType: "gift_card",
    targetId: id,
    metadata: { previous_status: card.status, reason },
  });

  revalidatePath("/admin/gift-cards");
  revalidatePath(`/admin/gift-cards/${id}`);
}

export async function resendGiftCardEmail(id: string) {
  await requireAdmin();
  const admin = getAdminSupabase();
  const { data: card } = await admin
    .from("gift_cards")
    .select("code, balance_pence, initial_value_pence, recipient_email, recipient_name, personal_message, expires_at, purchaser_email")
    .eq("id", id)
    .maybeSingle();
  if (!card) throw new Error("Card not found.");
  if (!card.recipient_email) throw new Error("No recipient email on file.");

  // Resend uses the current balance so the recipient sees what's actually
  // usable today (e.g. after a partial redemption).
  await notifyGiftCardIssued({
    toEmail: card.recipient_email,
    toName: card.recipient_name,
    fromName: card.purchaser_email,
    code: card.code,
    amountPence: card.balance_pence,
    message: card.personal_message,
    expiresAt: card.expires_at,
  });

  await admin
    .from("gift_cards")
    .update({ delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  await logAction({
    action: "gift_card.resent",
    targetType: "gift_card",
    targetId: id,
    metadata: { recipient: card.recipient_email },
  });

  revalidatePath(`/admin/gift-cards/${id}`);
}
