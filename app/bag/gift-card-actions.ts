"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { applicableDiscountPence } from "@/lib/gift-cards";
import { getEnrichedBag } from "@/lib/bag";

const COOKIE_NAME = "gift_card";

export type AppliedGiftCard = {
  code: string;
  balance_pence: number;
  applicable_pence: number;   // after Stripe-minimum cap, against current bag total
};

export async function applyGiftCard(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Paste your gift-card code." };

  const admin = getAdminSupabase();
  const { data: card } = await admin
    .from("gift_cards")
    .select("id, code, balance_pence, status, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (!card)                            return { ok: false, error: "We don't recognise that code." };
  if (card.status !== "active")         return { ok: false, error: "This card has been fully redeemed or cancelled." };
  if (card.balance_pence <= 0)          return { ok: false, error: "This card has no remaining balance." };
  if (card.expires_at && card.expires_at < new Date().toISOString().slice(0, 10)) {
    return { ok: false, error: "This card has expired." };
  }

  const c = await cookies();
  c.set(COOKIE_NAME, code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });

  revalidatePath("/bag");
  return { ok: true };
}

export async function removeGiftCard(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
  revalidatePath("/bag");
}

/**
 * Read the currently-applied card (if any), revalidate against the DB,
 * and compute how much can be applied to the current bag total. Returns
 * null when no code is in the cookie or the code is no longer valid.
 */
export async function readAppliedGiftCard(): Promise<AppliedGiftCard | null> {
  const c = await cookies();
  const code = c.get(COOKIE_NAME)?.value;
  if (!code) return null;

  const admin = getAdminSupabase();
  const { data: card } = await admin
    .from("gift_cards")
    .select("code, balance_pence, status, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (!card || card.status !== "active") return null;
  if (card.expires_at && card.expires_at < new Date().toISOString().slice(0, 10)) return null;

  const bag = await getEnrichedBag();
  const orderTotalPence = bag.subtotal * 100;
  const applicable = applicableDiscountPence(orderTotalPence, card.balance_pence);

  return {
    code: card.code,
    balance_pence: card.balance_pence,
    applicable_pence: applicable,
  };
}
