import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set. Stripe is not configured yet.");
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// In pence — Stripe expects integer minor units for GBP.
export const toMinor = (gbp: number) => Math.round(gbp * 100);
export const fromMinor = (minor: number) => minor / 100;
