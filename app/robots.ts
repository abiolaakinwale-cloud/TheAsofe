import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/admin-signin",
          "/dashboard/",
          "/account/",
          "/bag",
          "/checkout",
          "/signin",
          "/customer-signin",
          "/brand-signin",
          "/auth/",
          "/orders/confirmation",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
