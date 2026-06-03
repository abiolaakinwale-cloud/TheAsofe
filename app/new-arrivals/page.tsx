import Link from "next/link";
import type { Metadata } from "next";
import { getBrands, getNewArrivals } from "@/lib/queries";
import { getWishlistSlugs } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import Pagination from "@/components/Pagination";
import { applyFilters, computeFacetCounts, parseFilters } from "@/lib/filters";
import { paginate } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The newest pieces on the Asofe floor, from every designer.",
};

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [products, brands, sp, wishlistSlugs] = await Promise.all([
    getNewArrivals(),
    getBrands(),
    searchParams,
    getWishlistSlugs(),
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
  const facetCounts = computeFacetCounts(products, filters);
  const pageData = paginate(filtered, sp.page);

  return (
    <>
      <section style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 pt-8 lg:pt-12 pb-6 lg:pb-8">
          <nav className="text-[10px] tracking-[0.22em] uppercase mb-4" style={{ color: "var(--color-muted)" }}>
            <Link href="/" className="lux-link">Home</Link>
            <span className="mx-3" aria-hidden>·</span>
            <span style={{ color: "var(--color-ink)" }}>New Arrivals</span>
          </nav>
          <h1 className="display text-[clamp(1.8rem,3.4vw,3rem)] leading-[1.04] tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>
            New arrivals.
          </h1>
          <p className="text-sm mt-3 max-w-2xl leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Pieces that have landed at the London hub this season — fresh from the looms, ateliers, and benches of our designers.
            New stock added weekly.
          </p>
        </div>
      </section>

      <section className="border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-8 lg:py-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-3">
              <FilterSidebar
                brands={brandsRepresented}
                sizes={sizesRepresented}
                priceBounds={priceBounds}
                current={filters}
                totalCount={products.length}
                visibleCount={filtered.length}
                facetCounts={facetCounts}
                surface="new-arrivals"
              />
            </div>
            <div className="lg:col-span-9 mt-8 lg:mt-0">
              {products.length > 0 && (
                <ActiveFilterChips
                  current={filters}
                  brands={brandsRepresented}
                  visibleCount={filtered.length}
                  totalCount={products.length}
                  surface="new-arrivals"
                />
              )}
              {products.length === 0 ? (
                <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
                  No pieces marked as new arrivals yet. Check back shortly — designers tag fresh stock as it lands.
                </p>
              ) : filtered.length === 0 ? (
                <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
                  No pieces match these filters. Try widening your search.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 lg:gap-x-6 gap-y-12">
                    {pageData.items.map(p => (
                      <ProductCard key={p.slug} product={p} brand={brandsBySlug.get(p.brand)} inWishlist={wishlistSlugs.has(p.slug)} />
                    ))}
                  </div>
                  <Pagination page={pageData.page} totalPages={pageData.totalPages} searchParams={sp} />
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
