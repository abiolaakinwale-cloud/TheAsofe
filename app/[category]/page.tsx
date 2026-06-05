import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getBrands,
  getCategories,
  getCategory,
  getProductsByCategory,
  HIDDEN_CATEGORY_SLUGS,
} from "@/lib/queries";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import SubcategoryNav from "@/components/SubcategoryNav";
import Pagination from "@/components/Pagination";
import { applyFilters, computeFacetCounts, parseFilters } from "@/lib/filters";
import { paginate } from "@/lib/pagination";
import { getSubcategories } from "@/lib/subcategories";
import { getWishlistSlugs } from "@/lib/wishlist";
import { commerceEnabled } from "@/lib/launch-mode";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map(c => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const c = await getCategory(category);
  if (!c) return {};
  return { title: c.name, description: c.description };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!commerceEnabled()) notFound();
  const [{ category }, sp] = await Promise.all([params, searchParams]);
  if (HIDDEN_CATEGORY_SLUGS.has(category)) notFound();
  const [c, inCategory, brands, wishlistSlugs] = await Promise.all([
    getCategory(category),
    getProductsByCategory(category),
    getBrands(),
    getWishlistSlugs(),
  ]);
  if (!c) notFound();

  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));
  const brandsRepresented = Array.from(new Set(inCategory.map(p => p.brand)))
    .map(slug => brandsBySlug.get(slug)!)
    .filter(Boolean);

  const sizesRepresented = Array.from(new Set(inCategory.flatMap(p => p.sizes))).sort();
  const prices = inCategory.map(p => p.price);
  const priceBounds = prices.length
    ? { min: Math.min(...prices), max: Math.max(...prices) }
    : { min: 0, max: 0 };

  const filters = parseFilters(sp);
  const filtered = applyFilters(inCategory, filters);
  const facetCounts = computeFacetCounts(inCategory, filters);
  const pageData = paginate(filtered, sp.page);
  const subcategories = getSubcategories(category);

  return (
    <>
      <SubcategoryNav
        category={category}
        categoryName={c.name.toLowerCase()}
        subcategories={subcategories}
      />

      {/* Listing header — breadcrumb + title + count */}
      <section style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 pt-8 lg:pt-12 pb-6 lg:pb-8">
          <nav className="text-[10px] tracking-[0.22em] uppercase mb-4" style={{ color: "var(--color-muted)" }}>
            <Link href="/" className="lux-link">Home</Link>
            <span className="mx-3" aria-hidden>·</span>
            <span style={{ color: "var(--color-ink)" }}>{c.name}</span>
          </nav>
          <h1 className="display text-[clamp(1.8rem,3.4vw,3rem)] leading-[1.04] tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>
            {c.name}.
          </h1>
          <p className="text-sm mt-3 max-w-2xl leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            {c.description}
          </p>
        </div>
      </section>

      {/* Listing body — sidebar + grid */}
      <section className="border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-8 lg:py-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-3">
              <FilterSidebar
                brands={brandsRepresented}
                sizes={sizesRepresented}
                priceBounds={priceBounds}
                current={filters}
                totalCount={inCategory.length}
                visibleCount={filtered.length}
                facetCounts={facetCounts}
                surface="category"
              />
            </div>
            <div className="lg:col-span-9 mt-8 lg:mt-0">
              {inCategory.length > 0 && (
                <ActiveFilterChips
                  current={filters}
                  brands={brandsRepresented}
                  visibleCount={filtered.length}
                  totalCount={inCategory.length}
                  surface="category"
                />
              )}
              {inCategory.length === 0 ? (
                <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
                  The first pieces in this department arrive shortly.
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
