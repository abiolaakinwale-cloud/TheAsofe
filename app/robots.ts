import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { commerceEnabled } from "@/lib/launch-mode";

const ALWAYS_DISALLOWED = [
  "/admin/",
  "/admin-signin",
  "/dashboard/",
  "/account/",
  "/signin",
  "/customer-signin",
  "/brand-signin",
  "/auth/",
  "/api/",
];

const COMMERCE_DISALLOWED_WHEN_OFF = [
  "/bag",
  "/checkout",
  "/orders/",
  "/wishlists/",
  "/brands",
  "/new-arrivals",
  "/products/",
  "/collections",
  "/accessories",
  "/search",
  "/womenswear",
  "/menswear",
  "/shoes",
  "/jewellery",
  "/bags",
  "/stockists",
  "/concierge",
  "/gift-cards",
  "/care",
  "/shipping",
  "/returns",
  "/size-guide",
  "/buyer-protection",
  "/authentication",
];

const COMMERCE_DISALLOWED_WHEN_ON = [
  "/bag",
  "/checkout",
  "/orders/confirmation",
  "/wishlists/",
];

export default function robots(): MetadataRoute.Robots {
  const commerce = commerceEnabled();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          ...ALWAYS_DISALLOWED,
          ...(commerce ? COMMERCE_DISALLOWED_WHEN_ON : COMMERCE_DISALLOWED_WHEN_OFF),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
