import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAnonSupabase } from "@/lib/supabase/anon";
import { getBrands } from "@/lib/queries";
import ProductCard from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default async function WishlistPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account/wishlist");

  // 1. Fetch the slugs the user has wishlisted (newest first)
  const { data: rows } = await sb
    .from("wishlist")
    .select("product_slug, created_at")
    .order("created_at", { ascending: false });
  const slugs = (rows ?? []).map(r => r.product_slug);

  // 2. Hydrate product + brand data via anon client (catalog reads are public)
  const anon = getAnonSupabase();
  const [productsRes, brands] = await Promise.all([
    slugs.length
      ? anon
          .from("products")
          .select(
            "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks"
          )
          .in("slug", slugs)
      : Promise.resolve({ data: [] }),
    getBrands(),
  ]);
  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));

  const productBySlug = new Map((productsRes.data ?? []).map(p => [p.slug, p]));
  // Preserve wishlist order (newest-saved first)
  const products = slugs
    .map(s => productBySlug.get(s))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <>
      <Link href="/account" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Overview
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Saved for later</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>Wishlist.</h1>

      {products.length === 0 ? (
        <div className="max-w-xl space-y-4">
          <p className="text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Nothing saved yet. Tap the heart on any piece you want to keep an eye on — they&apos;ll all collect here.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Start browsing →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 lg:gap-x-6 gap-y-12">
          {products.map(p => {
            const mappedProduct = {
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
            };
            return (
              <ProductCard
                key={p.slug}
                product={mappedProduct}
                brand={brandsBySlug.get(p.brand)}
                inWishlist
              />
            );
          })}
        </div>
      )}
    </>
  );
}
