import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getBrands,
  getCategory,
  getProductsByCategory,
  HIDDEN_CATEGORY_SLUGS,
} from "@/lib/queries";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import Pagination from "@/components/Pagination";
import { applyFilters, parseFilters } from "@/lib/filters";
import { paginate } from "@/lib/pagination";
import { findSubcategory, SUBCATEGORIES } from "@/lib/subcategories";
import { getWishlistSlugs } from "@/lib/wishlist";

export async function generateStaticParams() {
  return Object.entries(SUBCATEGORIES).flatMap(([category, subs]) =>
    subs.map(s => ({ category, subcategory: s.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}): Promise<Metadata> {
  const { category, subcategory } = await params;
  const c = await getCategory(category);
  const sub = findSubcategory(category, subcategory);
  if (!c || !sub) return {};
  return {
    title: `${sub.name} · ${c.name}`,
    description: `${sub.name} from independent African designers — part of the Asofe ${c.name} edit.`,
  };
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ category, subcategory }, sp] = await Promise.all([params, searchParams]);
  if (HIDDEN_CATEGORY_SLUGS.has(category)) notFound();
  const sub = findSubcategory(category, subcategory);
  if (!sub) notFound();

  const [c, allInCategory, brands, wishlistSlugs] = await Promise.all([
    getCategory(category),
    getProductsByCategory(category),
    getBrands(),
    getWishlistSlugs(),
  ]);
  if (!c) notFound();

  const normalised = (v: string | undefined | null) =>
    (v ?? "").toLowerCase().replace(/[&]/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const products = allInCategory.filter(p => normalised(p.subcategory) === normalised(sub.slug));

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
  const pageData = paginate(filtered, sp.page);

  return (
    <>
      <section style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 pt-8 lg:pt-12 pb-6 lg:pb-8">
          <nav className="text-[10px] tracking-[0.22em] uppercase mb-4" style={{ color: "var(--color-muted)" }}>
            <Link href="/" className="lux-link">Home</Link>
            <span className="mx-3" aria-hidden>·</span>
            <Link href={`/${category}`} className="lux-link">{c.name}</Link>
            <span className="mx-3" aria-hidden>·</span>
            <span style={{ color: "var(--color-ink)" }}>{sub.name}</span>
          </nav>
          <h1 className="display text-[clamp(1.8rem,3.4vw,3rem)] leading-[1.04] tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>
            {sub.name}.
          </h1>
          <p className="text-sm mt-3 max-w-2xl leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            {sub.name} from the designers on the floor — part of the Asofe {c.name.toLowerCase()} edit.
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
              />
            </div>
            <div className="lg:col-span-9 mt-8 lg:mt-0">
              {products.length === 0 ? (
                <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
                  No {sub.name.toLowerCase()} on the floor yet. Try another part of the {c.name.toLowerCase()} edit.
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
