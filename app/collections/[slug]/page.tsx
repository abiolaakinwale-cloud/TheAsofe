import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollection, listCollections } from "@/lib/collections";
import { getJournalPost } from "@/lib/cms";
import { getBrands, getProducts } from "@/lib/queries";
import { getWishlistSlugs } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import { commerceEnabled } from "@/lib/launch-mode";

export async function generateStaticParams() {
  return listCollections().map(c => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCollection(slug);
  if (!c) return {};
  return {
    title: c.name,
    description: c.intro.slice(0, 160),
  };
}

const normalise = (v: string | undefined | null) =>
  (v ?? "").toLowerCase().replace(/[&]/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!commerceEnabled()) notFound();
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const [allProducts, brands, journal, wishlistSlugs] = await Promise.all([
    getProducts(),
    getBrands(),
    getJournalPost(collection.journalSlug),
    getWishlistSlugs(),
  ]);

  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));

  // Match products against the collection's filter — categories OR subcategory keywords
  const catSet = new Set((collection.productMatch.categories ?? []).map(normalise));
  const subSet = new Set((collection.productMatch.subcategoryKeywords ?? []).map(normalise));
  const matching = allProducts.filter(p => {
    if (catSet.size > 0 && catSet.has(normalise(p.category))) return true;
    if (subSet.size > 0 && p.subcategory && subSet.has(normalise(p.subcategory))) return true;
    return false;
  });
  // Cap at 12 so the page stays an "edit"
  const products = matching.slice(0, 12);

  const designers = (collection.designerCredits ?? [])
    .map(s => brandsBySlug.get(s))
    .filter((b): b is NonNullable<typeof b> => !!b);

  return (
    <>
      {/* Hero — cinematic */}
      <section className="relative overflow-hidden" style={{ backgroundColor: collection.ground, color: collection.inkLight ? "var(--color-ground)" : "var(--color-ink)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center min-h-[68vh] py-20 lg:py-28">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <nav className="text-[10px] tracking-[0.22em] uppercase mb-6" style={{ color: collection.inkLight ? "rgba(255,255,255,0.55)" : "var(--color-muted)" }}>
              <Link href="/collections" className="lux-link" style={{ color: "inherit" }}>Collections</Link>
              <span className="mx-3" aria-hidden>·</span>
              <span>{collection.name}</span>
            </nav>
            <p className="eyebrow mb-6" style={{ color: collection.inkLight ? "var(--color-saffron-soft)" : "var(--color-oxblood)" }}>
              {collection.eyebrow}
            </p>
            <h1 className="display text-[clamp(2.6rem,6vw,5.4rem)] leading-[1.02] tracking-[-0.015em] mb-8 max-w-[14ch]">
              {collection.name}.
            </h1>
            <p className="text-base lg:text-lg leading-relaxed max-w-xl mb-10" style={{ color: collection.inkLight ? "rgba(255,255,255,0.78)" : "var(--color-ink-soft)" }}>
              {collection.intro}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="#edit"
                className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
                style={{
                  backgroundColor: collection.inkLight ? "var(--color-ground)" : "var(--color-ink)",
                  color:           collection.inkLight ? "var(--color-ink)"    : "var(--color-ground)",
                }}
              >
                Shop the edit →
              </Link>
              {journal && (
                <Link
                  href={`/editorial/${journal.slug}`}
                  className="inline-flex items-center gap-3 text-[12px] tracking-[0.22em] uppercase font-medium pb-1 border-b"
                  style={{
                    borderColor: collection.inkLight ? "var(--color-saffron-soft)" : "var(--color-ink)",
                    color:       collection.inkLight ? "var(--color-saffron-soft)" : "var(--color-ink)",
                  }}
                >
                  Read the essay →
                </Link>
              )}
            </div>
          </div>
          <div className="lg:col-span-7 order-1 lg:order-2 relative aspect-[4/5] lg:aspect-[5/6] lg:max-h-[680px]">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={collection.heroImage}
                alt={collection.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Journal pull — large quote */}
      {journal && journal.body && (
        <section className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
          <div className="max-w-[72rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>From the Journal</p>
              <h2 className="display text-2xl lg:text-3xl leading-snug" style={{ color: "var(--color-ink)" }}>
                {journal.title}
              </h2>
              <Link
                href={`/editorial/${journal.slug}`}
                className="mt-6 inline-block text-[11px] tracking-[0.22em] uppercase font-medium lux-link"
                style={{ color: "var(--color-ink)" }}
              >
                Read the full essay →
              </Link>
            </div>
            <div className="lg:col-span-8 space-y-6 serif text-xl lg:text-2xl italic leading-snug" style={{ color: "var(--color-ink)" }}>
              {journal.body
                .split("\n\n")
                .slice(0, 2)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Product edit */}
      <section id="edit" className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12 lg:mb-16">
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>The Edit</p>
              <h2 className="display text-[clamp(1.8rem,3.4vw,3rem)]" style={{ color: "var(--color-ink)" }}>
                {products.length === 0 ? "Curating now." : `${products.length} pieces, chosen.`}
              </h2>
            </div>
            <Link href="/" className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link" style={{ color: "var(--color-ink)" }}>
              Browse everything →
            </Link>
          </div>

          {products.length === 0 ? (
            <p className="text-center py-24 text-base" style={{ color: "var(--color-muted)" }}>
              The first pieces in this edit land shortly. In the meantime,{" "}
              <Link href={`/editorial/${collection.journalSlug}`} className="lux-link" style={{ color: "var(--color-ink)" }}>read the essay</Link>.
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 lg:gap-x-6 gap-y-12">
              {products.map(p => (
                <ProductCard
                  key={p.slug}
                  product={p}
                  brand={brandsBySlug.get(p.brand)}
                  inWishlist={wishlistSlugs.has(p.slug)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Designer credits */}
      {designers.length > 0 && (
        <section className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
          <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
            <p className="eyebrow mb-3" style={{ color: "var(--color-cobalt)" }}>Featured in this edit</p>
            <h2 className="display text-3xl lg:text-4xl mb-12 max-w-[20ch]" style={{ color: "var(--color-ink)" }}>
              The designers behind the pieces.
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 lg:gap-x-12 gap-y-10">
              {designers.map(b => (
                <Link key={b.slug} href={`/brands/${b.slug}`} className="group block">
                  <div className="relative aspect-[4/3] mb-5 overflow-hidden" style={{ backgroundColor: "var(--color-ground)" }}>
                    <Image
                      src={b.heroImage}
                      alt={b.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="object-cover product-image"
                    />
                  </div>
                  <p className="serif text-2xl mb-1" style={{ color: "var(--color-ink)" }}>{b.name}</p>
                  <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{b.origin}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
