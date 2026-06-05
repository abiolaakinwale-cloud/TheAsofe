// Single source of truth for the pre-launch flag.
//
// While Asofe has no signed designers, the catalog/cart/checkout/brands
// surfaces stay hidden. Flip NEXT_PUBLIC_COMMERCE_ENABLED to "true" on the
// hosting platform once a real designer + real products are live.
//
// NEXT_PUBLIC_* is inlined at build time so this works in server + client
// components without a roundtrip.

export function commerceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_COMMERCE_ENABLED === "true";
}
