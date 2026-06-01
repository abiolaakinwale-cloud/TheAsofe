import { randomBytes } from "node:crypto";

/**
 * Stripe will refuse charges under £0.30, so we cap any gift-card discount
 * to leave at least this much for Stripe to capture. Future iteration: a
 * "fully-covered" path that skips Stripe altogether and marks the order
 * paid via a server-only action.
 */
export const STRIPE_MIN_CHARGE_GBP = 0.30;
export const STRIPE_MIN_CHARGE_PENCE = 30;

export const STANDARD_DENOMINATIONS_PENCE = [
  5000,    // £50
  10000,   // £100
  25000,   // £250
  50000,   // £500
  100000,  // £1,000
];

export const MIN_GIFT_AMOUNT_PENCE = 2500;     // £25
export const MAX_GIFT_AMOUNT_PENCE = 500_000;  // £5,000

/**
 * Generate a tidy gift-card code: ASOFE-XXXX-XXXX-XXXX (15 random base32
 * chars from a no-confusables alphabet, grouped 4-4-4). Collision-resistant
 * enough for the volumes we'll see; admin can regenerate if a collision
 * ever lands.
 */
export function generateGiftCardCode(): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/1/I/O confusables
  const bytes = randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) s += alpha[bytes[i] % alpha.length];
  return `ASOFE-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

/**
 * How much of a gift card can apply to a given order total, leaving at
 * least the Stripe minimum to charge.
 */
export function applicableDiscountPence(orderTotalPence: number, balancePence: number): number {
  if (balancePence <= 0 || orderTotalPence <= STRIPE_MIN_CHARGE_PENCE) return 0;
  const maxApplicable = orderTotalPence - STRIPE_MIN_CHARGE_PENCE;
  return Math.min(balancePence, maxApplicable);
}

export function formatGbpPence(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}
