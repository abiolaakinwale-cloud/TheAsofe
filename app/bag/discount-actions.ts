"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getEnrichedBag } from "@/lib/bag";
import { getServerSupabase } from "@/lib/supabase/server";
import { validateDiscount } from "@/lib/discounts";

const COOKIE = "discount_code";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Apply a discount code at the bag. Validated on every read so a stale cookie
// can't survive an order-history change (first-order rule, expiry, etc.).
export async function applyDiscountCode(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };

  const bag = await getEnrichedBag();
  if (bag.items.length === 0) return { ok: false, error: "Your bag is empty." };

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();

  const result = await validateDiscount({
    code,
    subtotalGbp:   bag.subtotal,
    customerEmail: user?.email ?? null,
    customerId:    user?.id ?? null,
  });
  if (!result.ok) return { ok: false, error: result.reason };

  const store = await cookies();
  store.set(COOKIE, code, { path: "/", maxAge: MAX_AGE, sameSite: "lax", httpOnly: false });
  revalidatePath("/bag");
  return { ok: true };
}

export async function removeDiscountCode(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
  revalidatePath("/bag");
}

/**
 * Read the discount cookie and re-validate against the current bag. Returns
 * null when the cookie is stale or doesn't apply.
 */
export async function readAppliedDiscount(): Promise<
  | null
  | { code: string; discountPence: number; kind: "percent" | "fixed"; value: number }
> {
  const store = await cookies();
  const code = store.get(COOKIE)?.value;
  if (!code) return null;

  const bag = await getEnrichedBag();
  if (bag.items.length === 0) return null;

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();

  const result = await validateDiscount({
    code,
    subtotalGbp:   bag.subtotal,
    customerEmail: user?.email ?? null,
    customerId:    user?.id ?? null,
  });
  if (!result.ok) return null;
  return {
    code: result.code.code,
    discountPence: result.discountPence,
    kind:  result.code.kind,
    value: result.code.value,
  };
}
