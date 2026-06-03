// Shipping economics. Single source of truth for the bag, checkout, and
// nav progress bar. Prices are whole pounds (matches lib/data.Product.price).

export const FREE_SHIPPING_THRESHOLD_GBP = 150;
export const STANDARD_SHIPPING_GBP = 9;       // UK standard delivery

export type ShippingState = {
  qualifies: boolean;
  /** 0..1 progress towards the threshold. Caps at 1. */
  progress: number;
  /** Whole pounds remaining (>= 0). */
  remaining: number;
  /** Shipping charge in whole pounds applied to this order. */
  charge: number;
};

export function shippingFor(subtotalGbp: number): ShippingState {
  const qualifies = subtotalGbp >= FREE_SHIPPING_THRESHOLD_GBP;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_GBP - subtotalGbp);
  const progress = qualifies ? 1 : subtotalGbp / FREE_SHIPPING_THRESHOLD_GBP;
  return {
    qualifies,
    progress,
    remaining,
    charge: qualifies ? 0 : STANDARD_SHIPPING_GBP,
  };
}
