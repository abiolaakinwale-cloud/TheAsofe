import type { Metadata } from "next";
import { getBrands, getNewArrivals } from "@/lib/queries";
import ProductCard from "@/components/ProductCard";
import CategoryFilters from "@/components/CategoryFilters";
import PageHero from "@/components/PageHero";
import { applyFilters, parseFilters } from "@/lib/filters";

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The newest pieces on the Asofe floor, from every designer.",
};

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [products, brands, sp] = await Promise.all([
    getNewArrivals(),
    getBrands(),
    searchParams,
  ]);

  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));
  const brandsRepresented = Array.from(new Set(products.map(p => p.brand)))
    .map(slug => brandsBySlug.get(slug)!)
    .filter(Boolean);
  const sizesRepresented = Array.from(new Set(products.flatMap(p => p.sizes))).sort();
  const prices = products.map(p => p.price);
  const priceBounds = prices.length
    ? { min: Math.min(...prices), max: Math.max(...prices) }
    : { min: 0, max: 0 };

  const filters = parseFilters(sp);
  const filtered = applyFilters(products, filters);

  return (
    <>
      <PageHero
        eyebrow={`Just in · ${products.length} pieces`}
        title="New arrivals."
        intro="Pieces that have landed at the London hub this season — fresh from the looms, ateliers, and benches of our designers. New stock added weekly."
        ground="var(--color-saffron-soft)"
      />

      <CategoryFilters
        brands={brandsRepresented}
        sizes={sizesRepresented}
        priceBounds={priceBounds}
        current={filters}
        totalCount={products.length}
        visibleCount={filtered.length}
      />

      <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
          {products.length === 0 ? (
            <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
              No pieces marked as new arrivals yet. Check back shortly — designers tag fresh stock as it lands.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
              No pieces match these filters. Try widening your search.
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-x-10 gap-y-14">
              {filtered.map(p => (
                <ProductCard key={p.slug} product={p} brand={brandsBySlug.get(p.brand)} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
