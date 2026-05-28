import type { Metadata } from "next";
import { getBrands, getProductsByCategories } from "@/lib/queries";
import ProductCard from "@/components/ProductCard";
import CategoryFilters from "@/components/CategoryFilters";
import { applyFilters, parseFilters } from "@/lib/filters";

const ACCESSORY_CATEGORIES = ["jewellery"];

export const metadata: Metadata = {
  title: "Accessories",
  description: "Jewellery from independent African designers.",
};

export default async function AccessoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [products, brands, sp] = await Promise.all([
    getProductsByCategories(ACCESSORY_CATEGORIES),
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
      <section style={{ backgroundColor: "var(--color-cream)", color: "var(--color-ink)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <p className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>
            Accessories · {products.length} pieces · {brandsRepresented.length} designers
          </p>
          <h1 className="display text-[clamp(2.4rem,5vw,4.8rem)] mb-6 max-w-[15ch]">
            Accessories.
          </h1>
          <p className="text-base lg:text-lg leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
            Jewellery from the designers on the floor. Pieces sized small enough to slip
            into a suitcase, considered enough to outlast the trip.
          </p>
        </div>
      </section>

      <CategoryFilters
        brands={brandsRepresented}
        sizes={sizesRepresented}
        priceBounds={priceBounds}
        current={filters}
        totalCount={products.length}
        visibleCount={filtered.length}
      />

      <section className="py-16 lg:py-24">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
          {products.length === 0 ? (
            <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
              The first accessories pieces arrive shortly.
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
