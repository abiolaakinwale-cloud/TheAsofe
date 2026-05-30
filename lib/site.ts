export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.theasofe.com";

export const SITE_NAME = "Asofe";
export const SITE_TAGLINE = "A House of Luxury";
export const SITE_DESCRIPTION =
  "A curated marketplace of independent African luxury houses. Aso oke, bazin riche, kente, mud cloth — ready-to-wear, leather goods, and jewellery.";
export const DEFAULT_OG_IMAGE = "/asofe/hero-main.png";

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
