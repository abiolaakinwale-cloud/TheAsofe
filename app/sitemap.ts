import type { MetadataRoute } from "next";
import { getProducts, getBrands, getCategories } from "@/lib/queries";
import { SUBCATEGORIES } from "@/lib/subcategories";
import { SITE_URL } from "@/lib/site";

const STATIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/",              changeFrequency: "daily",   priority: 1.0 },
  { path: "/new-arrivals",  changeFrequency: "daily",   priority: 0.9 },
  { path: "/brands",        changeFrequency: "weekly",  priority: 0.8 },
  { path: "/collections",   changeFrequency: "weekly",  priority: 0.8 },
  { path: "/editorial",     changeFrequency: "weekly",  priority: 0.7 },
  { path: "/stockists",     changeFrequency: "monthly", priority: 0.6 },
  { path: "/sellers",       changeFrequency: "monthly", priority: 0.6 },
  { path: "/concierge",     changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact",       changeFrequency: "monthly", priority: 0.5 },
  { path: "/philosophy",    changeFrequency: "yearly",  priority: 0.4 },
  { path: "/care",          changeFrequency: "yearly",  priority: 0.4 },
  { path: "/shipping",      changeFrequency: "yearly",  priority: 0.4 },
  { path: "/returns",       changeFrequency: "yearly",  priority: 0.4 },
  { path: "/size-guide",    changeFrequency: "yearly",  priority: 0.4 },
  { path: "/press",         changeFrequency: "monthly", priority: 0.4 },
  { path: "/careers",       changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms",         changeFrequency: "yearly",  priority: 0.3 },
  { path: "/privacy",       changeFrequency: "yearly",  priority: 0.3 },
  { path: "/cookies",       changeFrequency: "yearly",  priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(p => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  try {
    const [categories, products, brands] = await Promise.all([
      getCategories(),
      getProducts(),
      getBrands(),
    ]);

    for (const c of categories) {
      entries.push({
        url: `${SITE_URL}/${c.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
      for (const s of SUBCATEGORIES[c.slug] ?? []) {
        entries.push({
          url: `${SITE_URL}/${c.slug}/${s.slug}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.7,
        });
      }
    }

    for (const p of products) {
      entries.push({
        url: `${SITE_URL}/products/${p.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const b of brands) {
      entries.push({
        url: `${SITE_URL}/brands/${b.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // If the DB is unreachable at build time we still ship the static sitemap.
  }

  return entries;
}
