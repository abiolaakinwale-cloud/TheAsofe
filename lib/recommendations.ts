import "server-only";
import { getAnonSupabase } from "./supabase/anon";
import { getBrands, toProduct } from "./queries";
import type { Product, Brand } from "./data";

export type Recommendation = {
  product: Product;
  brand: Brand | null;
  boughtTogether: number;
};

/**
 * "Customers who bought X also bought Y" — backed by the
 * `product_copurchases` materialised view. Excludes any slug already in the
 * input list and only returns published, in-stock-or-MTO products.
 */
export async function getCoPurchased(slugs: string[], limit = 4): Promise<Recommendation[]> {
  const unique = Array.from(new Set(slugs)).filter(Boolean);
  if (unique.length === 0) return [];

  const sb = getAnonSupabase();
  const { data: edges } = await sb.rpc("recommend_with", {
    p_slugs: unique,
    p_limit: limit * 3,        // overscan; we filter below
  });

  const rows = (edges ?? []) as { slug: string; bought_together: number }[];
  if (rows.length === 0) return [];

  const targetSlugs = rows.map(r => r.slug);
  const [{ data: products }, brands] = await Promise.all([
    sb.from("products")
      .select("slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours")
      .in("slug", targetSlugs)
      .eq("published", true),
    getBrands(),
  ]);

  const bySlug   = new Map((products ?? []).map(p => [p.slug, p]));
  const byBrand  = new Map(brands.map(b => [b.slug, b]));

  const recs: Recommendation[] = [];
  for (const r of rows) {
    const row = bySlug.get(r.slug);
    if (!row) continue;
    recs.push({
      product: toProduct(row),
      brand:   byBrand.get(row.brand) ?? null,
      boughtTogether: r.bought_together,
    });
    if (recs.length >= limit) break;
  }
  return recs;
}
