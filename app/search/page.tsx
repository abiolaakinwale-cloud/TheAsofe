import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { searchCatalog, getBrands } from "@/lib/queries";
import ProductCard from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Asofe — pieces, designers, materials.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [{ products, brands: brandHits }, allBrands] = await Promise.all([
    query ? searchCatalog(query) : Promise.resolve({ products: [], brands: [] }),
    getBrands(),
  ]);
  const brandsBySlug = new Map(allBrands.map(b => [b.slug, b]));

  return (
    <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
        <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>The drawer</p>
        <h1 className="display text-4xl lg:text-5xl mb-10" style={{ color: "var(--color-ink)" }}>Search.</h1>

        <form action="/search" method="get" className="mb-16 max-w-2xl">
          <label className="block">
            <span className="sr-only">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="aso oke, Marrakech, evening jacket…"
              className="w-full bg-transparent border-b py-4 text-2xl outline-none focus:border-[var(--color-ink)] serif italic"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
          </label>
        </form>

        {!query ? (
          <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
            Search across the catalogue — names, materials, colours, designers, places of origin.
          </p>
        ) : products.length === 0 && brandHits.length === 0 ? (
          <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
            Nothing in the drawers matches <em className="serif italic">{query}</em>. Try a shorter word or a designer name.
          </p>
        ) : (
          <>
            {brandHits.length > 0 && (
              <section className="mb-20">
                <h2 className="eyebrow mb-8" style={{ color: "var(--color-emerald)" }}>
                  Designers · {brandHits.length}
                </h2>
                <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
                  {brandHits.map(b => (
                    <li key={b.slug} className="border-t pt-5" style={{ borderColor: "var(--color-rule)" }}>
                      <Link href={`/brands/${b.slug}`} className="block group">
                        <div className="relative aspect-[4/3] mb-4 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
                          <Image src={b.heroImage} alt={b.name} fill sizes="(max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                        </div>
                        <p className="serif text-2xl mb-1" style={{ color: "var(--color-ink)" }}>{b.name}</p>
                        <p className="text-xs tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>{b.origin}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {products.length > 0 && (
              <section>
                <h2 className="eyebrow mb-8" style={{ color: "var(--color-emerald)" }}>
                  Pieces · {products.length}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-x-10 gap-y-14">
                  {products.map(p => (
                    <ProductCard key={p.slug} product={p} brand={brandsBySlug.get(p.brand)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}
