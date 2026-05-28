export const ORDER_STATUS_LABEL = {
  pending:    "Awaiting payment",
  paid:       "Paid — awaiting fulfilment",
  packed:     "Packed",
  dispatched: "Dispatched",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
  refunded:   "Refunded",
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
