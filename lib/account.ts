export const ORDER_STATUS_LABEL = {
  pending:    "Awaiting payment",
  paid:       "Paid — awaiting fulfilment",
  packed:     "Packed",
  dispatched: "Dispatched",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
  refunded:   "Refunded",
} as const;

export const RETURN_STATUS_LABEL = {
  requested:  "Requested — awaiting receipt",
  approved:   "Approved",
  received:   "Received — inspecting",
  refunded:   "Refunded",
  rejected:   "Rejected",
  cancelled:  "Cancelled",
} as const;

export const RETURN_REASON_LABEL = {
  sizing:            "Wrong size",
  quality:           "Quality below expectation",
  not_as_described:  "Not as described",
  arrived_damaged:   "Arrived damaged",
  wrong_item:        "Wrong item sent",
  changed_mind:      "Changed mind",
  other:             "Other",
} as const;

export function formatPrice(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// Known courier templates. The tracking_url column overrides this if set.
// Fall back to a Google search if the courier isn't in this table.
const COURIER_LINKS: Record<string, (ref: string) => string> = {
  "royal mail":          ref => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(ref)}`,
  "royal mail tracked":  ref => `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(ref)}`,
  "dpd":                 ref => `https://track.dpd.co.uk/parcels/${encodeURIComponent(ref)}`,
  "evri":                ref => `https://www.evri.com/track/parcel/${encodeURIComponent(ref)}`,
  "hermes":              ref => `https://www.evri.com/track/parcel/${encodeURIComponent(ref)}`,
  "parcelforce":         ref => `https://www.parcelforce.com/track-trace?trackNumber=${encodeURIComponent(ref)}`,
  "ups":                 ref => `https://www.ups.com/track?tracknum=${encodeURIComponent(ref)}`,
  "dhl":                 ref => `https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(ref)}`,
  "fedex":               ref => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(ref)}`,
};

export function trackingLink(courier: string | null | undefined, ref: string | null | undefined, override: string | null | undefined): string | null {
  if (override) return override;
  if (!courier || !ref) return null;
  const fn = COURIER_LINKS[courier.toLowerCase().trim()];
  return fn ? fn(ref) : `https://www.google.com/search?q=${encodeURIComponent(`${courier} tracking ${ref}`)}`;
}
