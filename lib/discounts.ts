import "server-only";
import { randomBytes } from "node:crypto";
import { getAdminSupabase } from "./supabase/admin";
import { toMinor } from "./stripe";

export const WELCOME_PERCENT = 10;
export const WELCOME_EXPIRY_DAYS = 30;
export const RECOVERY_PERCENT = 10;
export const RECOVERY_EXPIRY_DAYS = 7;

export type DiscountCode = {
  code: string;
  kind: "percent" | "fixed";
  /** Percent (1-100) or pence (>= 0) depending on `kind`. */
  value: number;
  min_subtotal_pence: number;
  max_uses: number | null;
  uses_count: number;
  first_order_only: boolean;
  customer_email: string | null;
  source: string | null;
  expires_at: string | null;
};

export type ValidationResult =
  | { ok: true; code: DiscountCode; discountPence: number }
  | { ok: false; reason: string };

/** Crypto-strong, no-confusables, short — `ASF10-XXXX-XXXX`. */
export function generateDiscountCode(prefix = "ASF"): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += alpha[bytes[i] % alpha.length];
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

/**
 * Issue a fresh single-use welcome discount tied to an email. Idempotent on
 * email: returns the existing welcome code instead of minting duplicates.
 */
export async function issueWelcomeDiscount(email: string): Promise<DiscountCode> {
  const lower = email.trim().toLowerCase();
  const sb = getAdminSupabase();

  const { data: existing } = await sb
    .from("discount_codes")
    .select("*")
    .eq("customer_email", lower)
    .eq("source", "welcome")
    .maybeSingle();
  if (existing) return existing as DiscountCode;

  const code = generateDiscountCode("WELCOME");
  const expiresAt = new Date(Date.now() + WELCOME_EXPIRY_DAYS * 86_400_000).toISOString();
  const { data, error } = await sb.from("discount_codes").insert({
    code,
    kind:               "percent",
    value:              WELCOME_PERCENT,
    min_subtotal_pence: 0,
    max_uses:           1,
    first_order_only:   true,
    customer_email:     lower,
    source:             "welcome",
    expires_at:         expiresAt,
  }).select("*").single();
  if (error) throw error;
  return data as DiscountCode;
}

/** Issue a single-use 10% cart-recovery discount for an identity's email. */
export async function issueRecoveryDiscount(email: string): Promise<DiscountCode> {
  const lower = email.trim().toLowerCase();
  const sb = getAdminSupabase();

  const code = generateDiscountCode("BACK");
  const expiresAt = new Date(Date.now() + RECOVERY_EXPIRY_DAYS * 86_400_000).toISOString();
  const { data, error } = await sb.from("discount_codes").insert({
    code,
    kind:               "percent",
    value:              RECOVERY_PERCENT,
    min_subtotal_pence: 0,
    max_uses:           1,
    first_order_only:   false,
    customer_email:     lower,
    source:             "cart_recovery",
    expires_at:         expiresAt,
  }).select("*").single();
  if (error) throw error;
  return data as DiscountCode;
}

/**
 * Validate a code against an order context. Does not mutate — call
 * `recordRedemption` after the order is paid.
 */
export async function validateDiscount(args: {
  code: string;
  subtotalGbp: number;
  customerEmail: string | null;
  customerId: string | null;
}): Promise<ValidationResult> {
  const code = args.code.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a code." };

  const sb = getAdminSupabase();
  const { data } = await sb.from("discount_codes").select("*").eq("code", code).maybeSingle();
  if (!data) return { ok: false, reason: "This code isn't valid." };

  const dc = data as DiscountCode;

  if (dc.expires_at && new Date(dc.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "This code has expired." };
  }
  if (dc.max_uses !== null && dc.uses_count >= dc.max_uses) {
    return { ok: false, reason: "This code has already been used." };
  }
  if (dc.customer_email && args.customerEmail && dc.customer_email !== args.customerEmail.toLowerCase()) {
    return { ok: false, reason: "This code belongs to a different email." };
  }
  const subtotalPence = toMinor(args.subtotalGbp);
  if (subtotalPence < dc.min_subtotal_pence) {
    return { ok: false, reason: "Your bag is below the minimum for this code." };
  }
  if (dc.first_order_only && args.customerId) {
    const { count } = await sb
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", args.customerId)
      .in("status", ["paid","packed","dispatched","delivered","refunded"]);
    if ((count ?? 0) > 0) return { ok: false, reason: "First-order code — you've already shopped with us." };
  }

  const discountPence = dc.kind === "percent"
    ? Math.floor((subtotalPence * dc.value) / 100)
    : Math.min(dc.value, subtotalPence);

  return { ok: true, code: dc, discountPence };
}

/** Record a redemption + bump uses_count. Called from the Stripe webhook. */
export async function recordRedemption(args: {
  code: string;
  orderId: string;
  customerId: string | null;
  customerEmail: string;
  amountPence: number;
}): Promise<void> {
  const sb = getAdminSupabase();
  await sb.from("discount_redemptions").insert({
    code:           args.code,
    order_id:       args.orderId,
    customer_id:    args.customerId,
    customer_email: args.customerEmail,
    amount_pence:   args.amountPence,
  });
  // Atomically increment the use counter so a parallel checkout for the
  // same single-use code can't over-redeem.
  await sb.rpc("increment_discount_uses", { p_code: args.code }).then(r => {
    if (r.error) {
      // RPC missing in older deploys — fall back to a non-atomic update.
      return sb.from("discount_codes").select("uses_count").eq("code", args.code).maybeSingle()
        .then(({ data }) => sb.from("discount_codes")
          .update({ uses_count: (data?.uses_count ?? 0) + 1 })
          .eq("code", args.code));
    }
  });
}
