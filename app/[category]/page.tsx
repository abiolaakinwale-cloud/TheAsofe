import Image from "next/image";
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
import CategoryFilters from "@/components/CategoryFilters";
import { applyFilters, parseFilters } from "@/lib/filters";

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

const categoryGround: Record<string, { bg: string; ink: string; eyebrow: string }> = {
  womenswear: { bg: "var(--color-oxblood)",    ink: "var(--color-ground)", eyebrow: "var(--color-saffron-soft)" },
  menswear:   { bg: "var(--color-cobalt)",     ink: "var(--color-ground)", eyebrow: "var(--color-saffron-soft)" },
  bags:       { bg: "var(--color-terracotta)", ink: "var(--color-ground)", eyebrow: "var(--color-blush)" },
  shoes:      { bg: "var(--color-emerald)",    ink: "var(--color-ground)", eyebrow: "var(--color-saffron-soft)" },
  jewellery:  { bg: "var(--color-ink)",        ink: "var(--color-ground)", eyebrow: "var(--color-saffron-soft)" },
  objects:    { bg: "var(--color-sage)",       ink: "var(--color-ink)",    eyebrow: "var(--color-emerald)"     },
};

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ category }, sp] = await Promise.all([params, searchParams]);
  if (HIDDEN_CATEGORY_SLUGS.has(category)) notFound();
  const [c, inCategory, brands] = await Promise.all([
    getCategory(category),
    getProductsByCategory(category),
    getBrands(),
  ]);
  if (!c) notFound();

  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));
  const brandsRepresented = Array.from(new Set(inCategory.map(p => p.brand)))
    .map(slug => brandsBySlug.get(slug)!)
    .filter(Boolean);

  // Filter facets are derived from the category's full set so options stay stable.
  const sizesRepresented = Array.from(new Set(inCategory.flatMap(p => p.sizes))).sort();
  const prices = inCategory.map(p => p.price);
  const priceBounds = prices.length
    ? { min: Math.min(...prices), max: Math.max(...prices) }
    : { min: 0, max: 0 };

  const filters = parseFilters(sp);
  const filtered = applyFilters(inCategory, filters);

  const ground = categoryGround[category] ?? { bg: "var(--color-cream)", ink: "var(--color-ink)", eyebrow: "var(--color-emerald)" };

  return (
    <>
      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: ground.bg, color: ground.ink }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-10 items-stretch min-h-[42vh]">
          <div className="flex flex-col justify-center py-16 lg:py-24">
            <p className="eyebrow mb-6" style={{ color: ground.eyebrow }}>
              {c.name} · {inCategory.length} pieces · {brandsRepresented.length} designers
            </p>
            <h1 className="display text-[clamp(2.4rem,5vw,4.8rem)] mb-6 max-w-[15ch]">
              {c.name}.
            </h1>
            <p className="text-base lg:text-lg leading-relaxed max-w-md" style={{ color: ground.ink === "var(--color-ground)" ? "rgba(255,255,255,0.78)" : "var(--color-ink-soft)" }}>
              {c.description}
            </p>
          </div>
          <div className="relative min-h-[36vh] lg:min-h-[58vh]">
            <Image
              src={c.heroImage}
              alt={c.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ─── Filter strip ────────────────────────────────────────── */}
      <CategoryFilters
        brands={brandsRepresented}
        sizes={sizesRepresented}
        priceBounds={priceBounds}
        current={filters}
        totalCount={inCategory.length}
        visibleCount={filtered.length}
      />

      {/* ─── Grid ────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
          {inCategory.length === 0 ? (
            <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
              The first pieces in this department arrive shortly.
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

      {/* ─── Designers in this department ──────────────────────────── */}
      {brandsRepresented.length > 0 && (
        <section className="py-16 lg:py-20 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
          <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
            <div className="text-center mb-12">
              <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>Designers in this department</p>
              <h2 className="display text-2xl lg:text-4xl">Houses of {c.name.toLowerCase()}.</h2>
            </div>
            <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {brandsRepresented.map(b => (
                <li key={b!.slug}>
                  <Link href={`/brands/${b!.slug}`} className="lux-link">
                    <span className="serif text-xl lg:text-2xl" style={{ color: "var(--color-ink)" }}>{b!.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
