import "server-only";
import { cookies } from "next/headers";
import { getAnonSupabase } from "./supabase/anon";
import type { Brand, Product } from "./data";

export type BagItem = { slug: string; size: string; qty: number };

const COOKIE = "bag";
const MAX_QTY_PER_LINE = 9;

// ─── Cookie I/O ─────────────────────────────────────────────────────────────

export async function readBag(): Promise<BagItem[]> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is BagItem =>
        i && typeof i.slug === "string" && typeof i.size === "string" && Number.isInteger(i.qty) && i.qty > 0
    );
  } catch {
    return [];
  }
}

export async function writeBag(items: BagItem[]): Promise<void> {
  const store = await cookies();
  if (items.length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, JSON.stringify(items), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function bagCount(): Promise<number> {
  const items = await readBag();
  return items.reduce((n, i) => n + i.qty, 0);
}

// ─── Enriched bag (joined with product + brand + stock) ─────────────────────

export type EnrichedBagItem = BagItem & {
  product: Product;
  brand: Brand | null;
  stock: number;
  lineSubtotal: number;
};

export type EnrichedBag = {
  items: EnrichedBagItem[];
  subtotal: number;
  count: number;
};

export async function getEnrichedBag(): Promise<EnrichedBag> {
  const raw = await readBag();
  if (raw.length === 0) return { items: [], subtotal: 0, count: 0 };

  const slugs = Array.from(new Set(raw.map(i => i.slug)));
  const sb = getAnonSupabase();
  const [{ data: products }, { data: brands }, { data: stocks }] = await Promise.all([
    sb.from("products").select("*").in("slug", slugs),
    sb.from("brands").select("slug, name, tagline, founded, origin, story, hero_image"),
    sb.from("stock_levels").select("product_slug, size, quantity").in("product_slug", slugs),
  ]);

  const productBySlug = new Map((products ?? []).map(p => [p.slug, p]));
  const brandBySlug = new Map((brands ?? []).map(b => [b.slug, b]));
  const stockBySlugSize = new Map(
    (stocks ?? []).map(s => [`${s.product_slug}|${s.size}`, s.quantity])
  );

  const items: EnrichedBagItem[] = [];
  let subtotal = 0;
  let count = 0;

  for (const r of raw) {
    const p = productBySlug.get(r.slug);
    if (!p) continue; // dropped product
    const stock = stockBySlugSize.get(`${r.slug}|${r.size}`) ?? 0;
    // Made-to-order products can be ordered without on-hand stock.
    const canBackorder = !!p.made_to_order && !!p.lead_time_weeks && p.lead_time_weeks > 0;
    const cappedQty = canBackorder
      ? Math.min(r.qty, MAX_QTY_PER_LINE)
      : Math.min(r.qty, Math.max(stock, 0));
    if (cappedQty === 0) continue;
    const lineSubtotal = p.price * cappedQty;
    subtotal += lineSubtotal;
    count += cappedQty;
    items.push({
      slug: r.slug,
      size: r.size,
      qty: cappedQty,
      product: {
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        seller: p.seller,
        category: p.category,
        subcategory: p.subcategory ?? undefined,
        price: p.price,
        currency: p.currency,
        description: p.description,
        composition: p.composition,
        madeIn: p.made_in,
        sizes: p.sizes,
        colour: p.colour,
        images: p.images,
        newArrival: p.new_arrival || undefined,
        featured: p.featured || undefined,
        madeToOrder: p.made_to_order || undefined,
        leadTimeWeeks: p.lead_time_weeks ?? undefined,
      },
      brand: brandBySlug.get(p.brand)
        ? {
            slug: brandBySlug.get(p.brand)!.slug,
            name: brandBySlug.get(p.brand)!.name,
            tagline: brandBySlug.get(p.brand)!.tagline,
            founded: brandBySlug.get(p.brand)!.founded,
            origin: brandBySlug.get(p.brand)!.origin,
            story: brandBySlug.get(p.brand)!.story,
            heroImage: brandBySlug.get(p.brand)!.hero_image,
          }
        : null,
      stock,
      lineSubtotal,
    });
  }

  return { items, subtotal, count };
}

// Helper: stock for a single (product, size) — used by the product page to gate "Add to bag"
export async function getStock(productSlug: string): Promise<Record<string, number>> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("stock_levels")
    .select("size, quantity")
    .eq("product_slug", productSlug);
  const m: Record<string, number> = {};
  for (const r of data ?? []) m[r.size] = r.quantity;
  return m;
}

export const BAG_LIMITS = { perLine: MAX_QTY_PER_LINE };
