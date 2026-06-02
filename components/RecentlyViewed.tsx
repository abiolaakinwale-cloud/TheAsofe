import { cookies } from "next/headers";
import { getAnonSupabase } from "@/lib/supabase/anon";
import { getBrands } from "@/lib/queries";
import { getWishlistSlugs } from "@/lib/wishlist";
import { toProduct } from "@/lib/queries";
import ProductCard from "@/components/ProductCard";

type Props = {
  /** Optional slug to exclude (e.g. on a product page, don't show the current piece). */
  excludeSlug?: string;
  /** Max items to display. */
  limit?: number;
  /** Section heading override (defaults to "Recently viewed"). */
  heading?: string;
  /** Optional eyebrow override. */
  eyebrow?: string;
};

export default async function RecentlyViewed({ excludeSlug, limit = 4, heading = "Recently viewed", eyebrow = "Picking up where you left off" }: Props) {
  const c = await cookies();
  const raw = c.get("recently_viewed")?.value;
  if (!raw) return null;

  const slugs = raw.split(",").filter(Boolean).filter(s => s !== excludeSlug).slice(0, limit);
  if (slugs.length === 0) return null;

  const sb = getAnonSupabase();
  const [productsRes, brands, wishlistSlugs] = await Promise.all([
    sb.from("products")
      .select("slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks, colours")
      .in("slug", slugs)
      .eq("published", true),
    getBrands(),
    getWishlistSlugs(),
  ]);

  const rows = productsRes.data ?? [];
  if (rows.length === 0) return null;

  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));
  const productBySlug = new Map(rows.map(r => [r.slug, toProduct(r)]));
  // Preserve the cookie order (newest first)
  const products = slugs.map(s => productBySlug.get(s)).filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <section className="py-16 lg:py-20 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <div className="mb-10">
          <p className="eyebrow mb-3" style={{ color: "var(--color-muted)" }}>{eyebrow}</p>
          <h2 className="display text-2xl lg:text-4xl" style={{ color: "var(--color-ink)" }}>{heading}.</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-x-10 gap-y-12">
          {products.map(p => (
            <ProductCard
              key={p.slug}
              product={p}
              brand={brandsBySlug.get(p.brand)}
              inWishlist={wishlistSlugs.has(p.slug)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
