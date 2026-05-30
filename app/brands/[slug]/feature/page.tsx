import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrand, getBrands, getProductsByBrand } from "@/lib/queries";
import { getSiteSettings } from "@/lib/cms";
import { getWishlistSlugs } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map(b => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBrand(slug);
  if (!b) return {};
  return {
    title: `${b.name} · Spotlight`,
    description: b.tagline,
  };
}

export default async function DesignerFeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [brand, products, settings, wishlistSlugs] = await Promise.all([
    getBrand(slug),
    getProductsByBrand(slug),
    getSiteSettings(),
    getWishlistSlugs(),
  ]);
  if (!brand) notFound();

  const isCurrentSpotlight = settings.spotlight.enabled && settings.spotlight.brandSlug === slug;
  // Use the CMS editorial image when this brand is the active spotlight,
  // otherwise fall back to the brand's hero image.
  const editorialImage = isCurrentSpotlight ? settings.spotlight.editorialImage : brand.heroImage;
  const eyebrow = isCurrentSpotlight ? settings.spotlight.eyebrow : "House Spotlight";
  const quote = isCurrentSpotlight ? settings.spotlight.quote : null;
  const quoteAttribution = isCurrentSpotlight ? settings.spotlight.quoteAttribution : "";

  const keyPieces = products.slice(0, 6);
  // Split the story into paragraphs for editorial layout
  const paragraphs = (brand.story ?? "").split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  return (
    <>
      {/* ─── Cinematic hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
        <div className="relative w-full aspect-[16/9] lg:aspect-[21/9] max-h-[80vh] overflow-hidden">
          <Image
            src={editorialImage}
            alt={brand.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Subtle dark gradient at the bottom so the title is legible */}
          <div className="absolute inset-x-0 bottom-0 h-1/3" style={{
            background: "linear-gradient(to top, rgba(26,24,21,0.85), transparent)",
          }} />
          <div className="absolute inset-x-0 bottom-0 p-6 lg:p-16 max-w-[100rem] mx-auto">
            <p className="eyebrow mb-4" style={{ color: "var(--color-saffron-soft)" }}>
              {eyebrow}
            </p>
            <h1 className="display text-[clamp(3rem,7vw,7rem)] leading-[0.95] tracking-[-0.02em] max-w-[16ch]">
              {brand.name}.
            </h1>
            <p className="serif italic text-xl lg:text-2xl mt-6 max-w-2xl" style={{ color: "rgba(255,255,255,0.78)" }}>
              {brand.tagline}
            </p>
          </div>
        </div>

        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-8 flex flex-wrap items-center gap-x-10 gap-y-3 text-[11px] tracking-[0.22em] uppercase border-t" style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
          <span><span style={{ color: "rgba(255,255,255,0.4)" }}>Origin —</span> {brand.origin}</span>
          {brand.founded && brand.founded !== "—" && (
            <span><span style={{ color: "rgba(255,255,255,0.4)" }}>Founded —</span> {brand.founded}</span>
          )}
          <span><span style={{ color: "rgba(255,255,255,0.4)" }}>Pieces on the floor —</span> {products.length}</span>
        </div>
      </section>

      {/* ─── The story ───────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[72rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-3 lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>The story</p>
            <p className="display text-3xl lg:text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
              {brand.name}.
            </p>
            <Link
              href={`/brands/${brand.slug}`}
              className="mt-8 inline-block text-[11px] tracking-[0.22em] uppercase font-medium lux-link"
              style={{ color: "var(--color-ink)" }}
            >
              Shop the collection →
            </Link>
          </div>
          <div className="lg:col-span-9 space-y-7 text-lg lg:text-xl leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>{brand.story}</p>
            )}
          </div>
        </div>
      </section>

      {/* ─── Pull quote ──────────────────────────────────────────── */}
      {quote && (
        <section className="py-24 lg:py-32" style={{ backgroundColor: "var(--color-cream)" }}>
          <div className="max-w-[72rem] mx-auto px-6 lg:px-12 text-center">
            <svg aria-hidden width="32" height="24" viewBox="0 0 32 24" className="mx-auto mb-8" style={{ color: "var(--color-oxblood)", opacity: 0.5 }} fill="currentColor">
              <path d="M0 24V14c0-7 4-12 12-14l2 4c-5 1-7 4-7 8h5v12H0zm18 0V14c0-7 4-12 12-14l2 4c-5 1-7 4-7 8h5v12H18z"/>
            </svg>
            <p className="serif italic text-[clamp(1.6rem,3.4vw,2.8rem)] leading-[1.25] max-w-[28ch] mx-auto" style={{ color: "var(--color-ink)" }}>
              {quote}
            </p>
            {quoteAttribution && (
              <p className="mt-10 text-[11px] tracking-[0.22em] uppercase" style={{ color: "var(--color-muted)" }}>
                — {quoteAttribution}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ─── Key pieces ──────────────────────────────────────────── */}
      {keyPieces.length > 0 && (
        <section className="py-24 lg:py-32" style={{ backgroundColor: "var(--color-ground)" }}>
          <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
            <div className="flex items-end justify-between flex-wrap gap-6 mb-12 lg:mb-16">
              <div>
                <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Key pieces</p>
                <h2 className="display text-[clamp(1.8rem,3.4vw,3rem)] max-w-[20ch]" style={{ color: "var(--color-ink)" }}>
                  The pieces we keep returning to.
                </h2>
              </div>
              <Link
                href={`/brands/${brand.slug}`}
                className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link"
                style={{ color: "var(--color-ink)" }}
              >
                See the full collection →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 lg:gap-x-10 gap-y-14">
              {keyPieces.map(p => (
                <ProductCard
                  key={p.slug}
                  product={p}
                  brand={brand}
                  inWishlist={wishlistSlugs.has(p.slug)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Footer CTA ──────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-24 lg:py-32 text-center">
          <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>Continue reading</p>
          <h2 className="display text-[clamp(2rem,4vw,3.6rem)] max-w-[24ch] mx-auto mb-10">
            The other houses on our floor.
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/brands" className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}>
              All designers →
            </Link>
            <Link href={`/brands/${brand.slug}`} className="inline-flex items-center gap-3 text-[12px] tracking-[0.22em] uppercase font-medium pb-1 border-b" style={{ borderColor: "var(--color-saffron-soft)", color: "var(--color-saffron-soft)" }}>
              Shop {brand.name} →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
