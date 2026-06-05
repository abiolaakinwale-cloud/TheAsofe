import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrand, getBrands, getProductsByBrand } from "@/lib/queries";
import { getSiteSettings } from "@/lib/cms";
import { getWishlistSlugs } from "@/lib/wishlist";
import { paginate } from "@/lib/pagination";
import { SITE_URL, SITE_NAME, absoluteUrl } from "@/lib/site";
import { getBrandAggregate } from "@/lib/reviews";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import Stars from "@/components/Stars";
import { commerceEnabled } from "@/lib/launch-mode";

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map(b => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBrand(slug);
  if (!b) return {};
  const url = `${SITE_URL}/brands/${b.slug}`;
  const image = b.heroImage ? absoluteUrl(b.heroImage) : undefined;
  return {
    title: b.name,
    description: b.tagline,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title: `${b.name} — ${SITE_NAME}`,
      description: b.tagline,
      url,
      siteName: SITE_NAME,
      images: image ? [{ url: image, alt: b.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${b.name} — ${SITE_NAME}`,
      description: b.tagline,
      images: image ? [image] : undefined,
    },
  };
}

const brandGround: Record<string, string> = {
  "atelier-adunni":   "var(--color-oxblood)",     // Lagos — indigo & gold register
  "maison-diop":      "var(--color-cobalt)",      // Dakar — indigo / bazin register
  "kente-co":         "var(--color-emerald)",     // Bonwire — kente green/gold register
  "studio-wangari":   "var(--color-ink)",         // Nairobi — minimal/contemplative
  "talla":            "var(--color-terracotta)",  // Marrakech — earth / clay
  "house-of-ndlovu":  "var(--color-sage)",        // Karoo — pastoral / wool register
  "atelier-tessema":  "var(--color-saffron)",     // Addis — saffron / cotton register
  "bogolan-studio":   "var(--color-blush)",       // Bamako — mud cloth on cream
};

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!commerceEnabled()) notFound();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [brand, items, brands, settings, wishlistSlugs, brandRating] = await Promise.all([
    getBrand(slug),
    getProductsByBrand(slug),
    getBrands(),
    getSiteSettings(),
    getWishlistSlugs(),
    getBrandAggregate(slug),
  ]);
  if (!brand) notFound();
  const pageData = paginate(items, sp.page);
  const ground = brandGround[slug] ?? "var(--color-cream)";

  const brandSchema = {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: brand.name,
    description: brand.story || brand.tagline,
    url: `${SITE_URL}/brands/${brand.slug}`,
    logo: brand.heroImage ? absoluteUrl(brand.heroImage) : undefined,
    foundingDate: brand.founded ? String(brand.founded) : undefined,
    foundingLocation: brand.origin ? { "@type": "Place", name: brand.origin } : undefined,
  };
  const isDark = ground !== "var(--color-blush)" && ground !== "var(--color-saffron)" && ground !== "var(--color-sage)" && ground !== "var(--color-cream)";
  const ink = isDark ? "var(--color-ground)" : "var(--color-ink)";
  const eyebrowColour = isDark ? "var(--color-saffron-soft)" : "var(--color-oxblood)";
  const isFeatured = settings.spotlight.enabled && settings.spotlight.brandSlug === slug;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(brandSchema) }} />
      {/* ─── Atelier portrait ────────────────────────────────────── */}
      <section style={{ backgroundColor: ground, color: ink }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 lg:gap-20 min-h-[70vh] items-stretch">
          <div className="flex flex-col justify-center py-20 lg:py-24">
            <p className="eyebrow mb-6" style={{ color: eyebrowColour }}>
              {brand.origin} · Established {brand.founded}
            </p>
            <h1 className="display text-[clamp(2.6rem,6vw,5.6rem)] mb-8">
              {brand.name}.
            </h1>
            <p className="serif text-xl lg:text-2xl mb-8 max-w-md italic" style={{ color: isDark ? "rgba(255,255,255,0.85)" : "var(--color-ink-soft)" }}>
              {brand.tagline}
            </p>
            {brandRating.count > 0 && (
              <div className="mb-8 flex items-center gap-3 flex-wrap">
                <Stars value={brandRating.average} size="md" />
                <span className="text-xs tabular-nums" style={{ color: isDark ? "rgba(255,255,255,0.85)" : "var(--color-ink-soft)" }}>
                  {brandRating.average.toFixed(1)} · {brandRating.count} verified {brandRating.count === 1 ? "review" : "reviews"} across the collection
                </span>
              </div>
            )}
            <p className="text-base lg:text-lg leading-relaxed max-w-lg" style={{ color: isDark ? "rgba(255,255,255,0.75)" : "var(--color-ink-soft)" }}>
              {brand.story}
            </p>
            {isFeatured && (
              <Link
                href={`/brands/${brand.slug}/feature`}
                className="mt-8 inline-flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase font-medium pb-1 border-b w-fit"
                style={{ borderColor: eyebrowColour, color: eyebrowColour }}
              >
                Read the spotlight feature →
              </Link>
            )}
          </div>
          <div className="relative min-h-[60vh] lg:min-h-0">
            <Image
              src={brand.heroImage}
              alt={brand.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ─── House products ──────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="rule mb-6" />
              <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>The Collection</p>
              <h2 className="display text-3xl lg:text-5xl">
                {items.length} {items.length === 1 ? "piece" : "pieces"} in the house.
              </h2>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
              New work from {brand.name} arrives shortly.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-x-10 gap-y-14">
                {pageData.items.map(p => <ProductCard key={p.slug} product={p} brand={brand} inWishlist={wishlistSlugs.has(p.slug)} />)}
              </div>
              <Pagination page={pageData.page} totalPages={pageData.totalPages} searchParams={sp} />
            </>
          )}
        </div>
      </section>

      {/* ─── Other designers ───────────────────────────────────────── */}
      <section className="py-16 lg:py-20 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
          <p className="eyebrow mb-3 text-center" style={{ color: "var(--color-cobalt)" }}>Continue browsing</p>
          <h2 className="display text-2xl lg:text-3xl text-center mb-10">Other designers.</h2>
          <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {brands.filter(b => b.slug !== brand.slug).map(b => (
              <li key={b.slug}>
                <Link href={`/brands/${b.slug}`} className="lux-link">
                  <span className="serif text-xl lg:text-2xl" style={{ color: "var(--color-ink)" }}>{b.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
