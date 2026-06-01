// Sensible default HS codes (UK HMRC tariff) per product category. Designer
// can override per-line. These are catch-all 6-digit headings; for production
// HMRC paperwork, the customs broker may require a 10-digit commodity code.
// See: https://www.gov.uk/trade-tariff
export const HS_CODE_BY_CATEGORY: Record<string, { code: string; description: string }> = {
  womenswear:  { code: "620443", description: "Women's woven dresses, of synthetic fibres" },
  menswear:    { code: "620333", description: "Men's woven jackets and blazers, of synthetic fibres" },
  bags:        { code: "420221", description: "Handbags of leather or composition leather" },
  shoes:       { code: "640391", description: "Footwear with leather uppers, covering ankle" },
  jewellery:   { code: "711319", description: "Articles of jewellery, of precious metal" },
  accessories: { code: "650500", description: "Hats and other headgear, knitted or crocheted" },
};

export function defaultHsCode(category: string | null | undefined): { code: string; description: string } | null {
  if (!category) return null;
  return HS_CODE_BY_CATEGORY[category] ?? null;
}

// Common country-of-origin lookup for the African designers we work with.
// Designer can still override per-shipment; this is just the sensible default.
export const ORIGIN_BY_BRAND: Record<string, { iso: string; name: string }> = {
  "atelier-adunni":  { iso: "NG", name: "Nigeria" },
  "maison-diop":     { iso: "SN", name: "Senegal" },
  "kente-co":        { iso: "GH", name: "Ghana" },
  "studio-wangari":  { iso: "KE", name: "Kenya" },
  "talla":           { iso: "MA", name: "Morocco" },
  "house-of-ndlovu": { iso: "ZA", name: "South Africa" },
  "atelier-tessema": { iso: "ET", name: "Ethiopia" },
  "bogolan-studio":  { iso: "ML", name: "Mali" },
};

export function defaultOrigin(brandSlug: string | null | undefined): { iso: string; name: string } | null {
  if (!brandSlug) return null;
  return ORIGIN_BY_BRAND[brandSlug] ?? null;
}

export function generateInvoiceNumber(shipmentId: string): string {
  // ASF-YYYY-XXXX (first 4 chars of shipment uuid uppercased)
  const year = new Date().getFullYear();
  const ref = shipmentId.slice(0, 4).toUpperCase();
  return `ASF-${year}-${ref}`;
}
