import "server-only";
import { getAnonSupabase } from "./supabase/anon";
import type { Brand, Category, Product, Seller } from "./data";

// ─── Row mapping ────────────────────────────────────────────────────────────
// Supabase tables are snake_case; the app types are camelCase. Map at the edge
// so the rest of the code keeps the existing shape.

type ProductRow = {
  slug: string;
  name: string;
  brand: string;
  seller: string;
  category: string;
  subcategory: string | null;
  price: number;
  currency: "GBP";
  description: string;
  composition: string[];
  made_in: string;
  sizes: string[];
  colour: string;
  images: string[];
  new_arrival: boolean;
  featured: boolean;
  made_to_order?: boolean;
  lead_time_weeks?: number | null;
  colours?: string[] | null;
};

type BrandRow = {
  slug: string;
  name: string;
  tagline: string;
  founded: string;
  origin: string;
  story: string;
  hero_image: string;
};

type CategoryRow = {
  slug: string;
  name: string;
  description: string;
  hero_image: string;
};

const toProduct = (r: ProductRow): Product => ({
  slug: r.slug,
  name: r.name,
  brand: r.brand,
  seller: r.seller,
  category: r.category,
  subcategory: r.subcategory ?? undefined,
  price: r.price,
  currency: r.currency,
  description: r.description,
  composition: r.composition,
  madeIn: r.made_in,
  sizes: r.sizes,
  colour: r.colour,
  images: r.images,
  newArrival: r.new_arrival || undefined,
  featured: r.featured || undefined,
  madeToOrder: r.made_to_order || undefined,
  leadTimeWeeks: r.lead_time_weeks ?? undefined,
  colours: r.colours && r.colours.length > 0 ? r.colours : undefined,
});

const toBrand = (r: BrandRow): Brand => ({
  slug: r.slug,
  name: r.name,
  tagline: r.tagline,
  founded: r.founded,
  origin: r.origin,
  story: r.story,
  heroImage: r.hero_image,
});

const toCategory = (r: CategoryRow): Category => ({
  slug: r.slug,
  name: r.name,
  description: r.description,
  heroImage: r.hero_image,
});

// ─── Queries ────────────────────────────────────────────────────────────────

// Slugs that exist in the DB but are hidden from listings/navigation. Keep
// the rows so historical product links and admin tooling still resolve.
export const HIDDEN_CATEGORY_SLUGS = new Set(["objects"]);

export async function getCategories(): Promise<Category[]> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("categories")
    .select("slug, name, description, hero_image")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map(toCategory).filter(c => !HIDDEN_CATEGORY_SLUGS.has(c.slug));
}

export async function getBrands(): Promise<Brand[]> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("brands")
    .select("slug, name, tagline, founded, origin, story, hero_image")
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toBrand);
}

export async function getSellers(): Promise<Seller[]> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("sellers")
    .select("slug, name, type, location")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Seller[];
}

export async function getProducts(): Promise<Product[]> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toProduct);
}

export async function getCategory(slug: string): Promise<Category | null> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("categories")
    .select("slug, name, description, hero_image")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toCategory(data) : null;
}

export async function getBrand(slug: string): Promise<Brand | null> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("brands")
    .select("slug, name, tagline, founded, origin, story, hero_image")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toBrand(data) : null;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data) : null;
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
    )
    .eq("category", slug)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toProduct);
}

export async function getProductsByCategories(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
    )
    .in("category", slugs)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toProduct);
}

// Match products whose stored subcategory matches any of the given URL-style
// slugs, regardless of parent category. Uses a normalised comparison so stored
// values like "Suits & Blazers" still match the slug "suits-blazers".
export async function getProductsBySubcategories(subSlugs: string[]): Promise<Product[]> {
  if (subSlugs.length === 0) return [];
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
    )
    .not("subcategory", "is", null)
    .order("name");
  if (error) throw error;
  const normalise = (v: string | null | undefined) =>
    (v ?? "").toLowerCase().replace(/[&]/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const targets = new Set(subSlugs.map(normalise));
  return (data ?? []).filter(r => targets.has(normalise(r.subcategory))).map(toProduct);
}

export async function getProductsByBrand(slug: string): Promise<Product[]> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
    )
    .eq("brand", slug)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toProduct);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
    )
    .eq("featured", true)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toProduct);
}

export async function searchCatalog(qRaw: string): Promise<{ products: Product[]; brands: Brand[] }> {
  const q = qRaw.trim();
  if (!q) return { products: [], brands: [] };

  // Escape ILIKE wildcards so a literal '%' in the query doesn't match everything.
  const safe = q.replace(/[%_]/g, ch => `\\${ch}`);
  const pattern = `%${safe}%`;

  const sb = getAnonSupabase();
  const [productRes, brandRes] = await Promise.all([
    sb.from("products")
      .select(
        "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
      )
      .or(`name.ilike.${pattern},description.ilike.${pattern},colour.ilike.${pattern}`)
      .limit(40),
    sb.from("brands")
      .select("slug, name, tagline, founded, origin, story, hero_image")
      .or(`name.ilike.${pattern},story.ilike.${pattern},origin.ilike.${pattern}`)
      .limit(12),
  ]);

  if (productRes.error) throw productRes.error;
  if (brandRes.error)   throw brandRes.error;

  return {
    products: (productRes.data ?? []).map(toProduct),
    brands:   (brandRes.data   ?? []).map(toBrand),
  };
}

export async function getNewArrivals(): Promise<Product[]> {
  const sb = getAnonSupabase();
  const { data, error } = await sb
    .from("products")
    .select(
      "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours"
    )
    .eq("new_arrival", true)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toProduct);
}
