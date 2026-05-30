import type { ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  getBrands,
  getCategories,
  getFeaturedProducts,
} from "@/lib/queries";
import { getSiteSettings, getPublishedJournalPosts } from "@/lib/cms";
import { getWishlistSlugs } from "@/lib/wishlist";
import ProductCard from "@/components/ProductCard";
import Reveal, { Stagger, StaggerItem } from "./sellers/_components/Reveal";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/asofe/hero-main.png`,
  description: SITE_DESCRIPTION,
  sameAs: [] as string[],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export default async function HomePage() {
  const [brands, categories, featured, settings, journalPosts, wishlistSlugs] = await Promise.all([
    getBrands(),
    getCategories(),
    getFeaturedProducts(),
    getSiteSettings(),
    getPublishedJournalPosts(),
    getWishlistSlugs(),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <Hero settings={settings} />
      <StatsStrip />
      <ShopByCategory categories={categories} />
      <Mission />
      {featured.length > 0 && (
        <FeaturedEdit
          products={featured.slice(0, 4)}
          brandsBySlug={new Map(brands.map(b => [b.slug, b]))}
          wishlistSlugs={wishlistSlugs}
        />
      )}
      {settings.spotlight.enabled && (() => {
        const spot = brands.find(b => b.slug === settings.spotlight.brandSlug);
        return spot ? <DesignerSpotlightBand brand={spot} settings={settings} /> : null;
      })()}
      <FeaturedDesigners brands={brands} />
      <SellerBand image={settings.images.sellersBand} />
      <ShopWithConfidence />
      <LovedByCommunity />
      <FromTheJournal posts={journalPosts.slice(0, 3)} />
      <GlobalHomeCta />
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  "UK Fulfilled",
  "Fast UK Delivery",
  "UK Returns",
  "Secure Payments",
  "Verified Designers",
];

function Hero({ settings }: { settings: Awaited<ReturnType<typeof getSiteSettings>> }) {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center lg:min-h-[780px] py-16 lg:py-24">
        <div className="lg:col-span-6 order-2 lg:order-1">
          <Reveal>
            <p className="eyebrow mb-8" style={{ color: "var(--color-oxblood)" }}>
              Volume One · Spring 2026
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="display text-[clamp(2.8rem,6vw,5.8rem)] leading-[1.02] tracking-[-0.015em] mb-8 max-w-[16ch]" style={{ color: "var(--color-ink)" }}>
              {settings.hero.title}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg lg:text-xl leading-relaxed max-w-xl mb-12" style={{ color: "var(--color-ink-soft)" }}>
              {settings.hero.body}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link
                href={settings.hero.primaryHref}
                className="inline-block px-9 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
              >
                {settings.hero.primaryLabel}
              </Link>
              <Link
                href={settings.hero.secondaryHref}
                className="inline-flex items-center gap-3 px-9 py-4 text-[12px] tracking-[0.22em] uppercase font-medium border transition-colors hover:bg-[var(--color-cream)]"
                style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
              >
                {settings.hero.secondaryLabel}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--color-muted)" }}>
              {TRUST_BADGES.map((b, i) => (
                <li key={b} className="inline-flex items-center gap-3">
                  {i > 0 && <span aria-hidden style={{ color: "var(--color-rule)" }}>·</span>}
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2 relative aspect-[4/5] lg:aspect-[3/4] lg:max-h-[720px]">
          <Reveal className="absolute inset-0">
            <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
              <Image
                src={settings.hero.image}
                alt={settings.hero.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            {/* Floating verified badge — desktop only, lower-right of the image */}
            <div className="hidden lg:flex absolute bottom-6 right-6 items-center gap-3 px-5 py-3 text-[10px] tracking-[0.22em] uppercase font-medium backdrop-blur" style={{ backgroundColor: "rgba(26,24,21,0.78)", color: "var(--color-ground)" }}>
              <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-emerald)" }} />
              UK Fulfilled · Verified Designers
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────────────

const stats: { stat: string; label: string }[] = [
  { stat: "2–4 d",  label: "UK delivery on stocked pieces" },
  { stat: "500+",   label: "Verified designers in onboarding" },
  { stat: "99 %",   label: "Order success rate" },
  { stat: "28 d",   label: "Complimentary returns window" },
];

function StatsStrip() {
  return (
    <section className="border-y" style={{ backgroundColor: "var(--color-cream)", borderColor: "var(--color-rule)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-10 lg:py-12">
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
          {stats.map(s => (
            <StaggerItem key={s.label}>
              <p className="display text-[clamp(2rem,3vw,2.8rem)] leading-none mb-3" style={{ color: "var(--color-ink)" }}>
                {s.stat}
              </p>
              <p className="text-[11px] tracking-[0.18em] uppercase font-medium leading-snug max-w-[26ch]" style={{ color: "var(--color-ink-soft)" }}>
                {s.label}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── Shop by category ────────────────────────────────────────────────────────

function ShopByCategory({ categories }: { categories: Awaited<ReturnType<typeof getCategories>> }) {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12 lg:mb-16">
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Shop by category</p>
              <h2 className="display text-[clamp(1.8rem,3.4vw,3rem)]" style={{ color: "var(--color-ink)" }}>
                Six departments. One curated house.
              </h2>
            </div>
            <Link href="/brands" className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link" style={{ color: "var(--color-ink)" }}>
              View all designers →
            </Link>
          </div>
        </Reveal>

        <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {categories.map(c => (
            <StaggerItem key={c.slug}>
              <Link href={`/${c.slug}`} className="group block">
                <div className="relative aspect-[3/4] mb-4 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
                  <Image
                    src={c.heroImage}
                    alt={c.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 16vw"
                    className="object-cover product-image"
                  />
                </div>
                <p className="text-[11px] tracking-[0.18em] uppercase font-medium text-center" style={{ color: "var(--color-ink)" }}>
                  {c.name}
                </p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── Our Mission — emotional brand storytelling ─────────────────────────────

function Mission() {
  return (
    <section className="py-24 lg:py-40 border-t" style={{ backgroundColor: "var(--color-cream)", borderColor: "var(--color-rule)" }}>
      <div className="max-w-[88rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>Our Mission</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="display text-[clamp(2rem,4.2vw,4rem)] leading-[1.04] tracking-[-0.01em] max-w-[16ch]" style={{ color: "var(--color-ink)" }}>
              Connecting African creativity with global customers.
            </h2>
          </Reveal>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-3">
          <Stagger className="space-y-7 text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            <StaggerItem>
              <p>
                African designers make some of the most considered clothing in the world. Until now, getting it to a wardrobe
                in London, Paris, or Toronto has meant weeks of waiting, customs paperwork, and a leap of faith on returns.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p>
                Asofe is the infrastructure that closes that gap. We hold stock for our designers in London, fulfil in
                two to four days, and handle returns locally — so a piece from a Lagos atelier arrives like it was always
                meant to.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p>
                For our designers, that means a real export channel without flying every order across an ocean. For our
                customers, it means the clothes you grew up around — done with the precision of a luxury house, delivered
                with the speed of one.
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="pt-4">
                <Link
                  href="/sellers"
                  className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link"
                  style={{ color: "var(--color-ink)" }}
                >
                  Read about the platform →
                </Link>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </div>
    </section>
  );
}

// ─── Shop With Confidence — buyer-protection block ──────────────────────────

const confidencePoints: { title: string; body: string; icon: ReactNode }[] = [
  { title: "UK fulfilment",         body: "Pieces are dispatched from our London hub — no cross-border surprises, no customs bills on the doorstep.", icon: <IconTruck /> },
  { title: "UK returns address",    body: "28 days to return, handled locally. Refunds typically clear within ten working days of arrival.",          icon: <IconReturn /> },
  { title: "Verified designers",    body: "Every house on the floor is vetted by our team. Provenance is documented; counterfeits don't make it in.", icon: <IconShield /> },
  { title: "Secure GBP checkout",   body: "Pay in pounds with cards, Apple Pay, or Google Pay. Payment infrastructure handled by Stripe.",            icon: <IconCard /> },
];

function ShopWithConfidence() {
  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="text-center mb-16 lg:mb-20 max-w-[44ch] mx-auto">
            <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Shop With Confidence</p>
            <h2 className="display text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.06] tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>
              Buying African fashion shouldn&apos;t be a leap of faith.
            </h2>
          </div>
        </Reveal>
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px max-w-[88rem] mx-auto" style={{ backgroundColor: "var(--color-rule)" }}>
          {confidencePoints.map(p => (
            <StaggerItem
              key={p.title}
              className="p-8 lg:p-10"
              style={{ backgroundColor: "var(--color-ground)" }}
            >
              <span className="inline-flex items-center justify-center w-10 h-10 mb-8" style={{ color: "var(--color-ink)" }}>
                {p.icon}
              </span>
              <h3 className="serif text-xl lg:text-2xl mb-4 leading-snug" style={{ color: "var(--color-ink)" }}>
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                {p.body}
              </p>
            </StaggerItem>
          ))}
        </Stagger>

        {/* The promise */}
        <Reveal>
          <div className="mt-20 lg:mt-24 max-w-[68rem] mx-auto px-8 lg:px-16 py-12 lg:py-16 text-center" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            <p className="eyebrow mb-5" style={{ color: "var(--color-saffron-soft)" }}>The Asofe Promise</p>
            <p className="serif text-xl lg:text-2xl italic leading-relaxed max-w-[44ch] mx-auto mb-8">
              &ldquo;If your order arrives damaged, incorrect, or significantly different from the listing, Asofe will make it right.&rdquo;
            </p>
            <Link
              href="/returns"
              className="inline-block text-[11px] tracking-[0.22em] uppercase font-medium pb-1 border-b"
              style={{ borderColor: "var(--color-saffron-soft)", color: "var(--color-saffron-soft)" }}
            >
              Read the buyer protection policy →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Dark "Built for African brands" band ───────────────────────────────────

function SellerBand({ image }: { image: string }) {
  return (
    <section style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-24 lg:py-32 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div className="lg:col-span-6">
          <Reveal>
            <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>For brands</p>
            <h2 className="display text-[clamp(2rem,4.4vw,4rem)] leading-[1.06] tracking-[-0.01em] mb-8 max-w-[18ch]">
              Built for African fashion brands ready to scale globally.
            </h2>
            <p className="text-base lg:text-lg leading-relaxed max-w-lg mb-10" style={{ color: "rgba(255,255,255,0.78)" }}>
              UK fulfilment, returns handling, and access to diaspora shoppers — so your atelier can sell internationally without shipping every order from Lagos.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/sellers"
                className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
              >
                Apply as a brand
              </Link>
              <Link
                href="/sellers#how-it-works"
                className="inline-flex items-center gap-3 text-[12px] tracking-[0.22em] uppercase font-medium pb-1 border-b"
                style={{ borderColor: "var(--color-saffron-soft)", color: "var(--color-saffron-soft)" }}
              >
                How it works →
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="lg:col-span-6 relative aspect-[4/5] lg:aspect-[5/6]">
          <Reveal className="absolute inset-0">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={image}
                alt="An Asofe partner brand model"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Featured designers row ───────────────────────────────────────────────────

function DesignerSpotlightBand({
  brand,
  settings,
}: {
  brand: Awaited<ReturnType<typeof getBrands>>[number];
  settings: Awaited<ReturnType<typeof getSiteSettings>>;
}) {
  return (
    <section style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-24 lg:py-32 grid lg:grid-cols-12 gap-10 lg:gap-16 items-stretch">
        <div className="lg:col-span-7 relative aspect-[4/5] lg:aspect-[5/6] order-1">
          <Reveal className="absolute inset-0">
            <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
              <Image
                src={settings.spotlight.editorialImage}
                alt={brand.name}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
        <div className="lg:col-span-5 order-2 flex flex-col justify-center">
          <Reveal>
            <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>
              {settings.spotlight.eyebrow}
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="display text-[clamp(2.4rem,5vw,4.6rem)] leading-[1.04] tracking-[-0.01em] mb-6 max-w-[14ch]">
              {brand.name}.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="serif italic text-xl lg:text-2xl mb-10 max-w-md" style={{ color: "rgba(255,255,255,0.78)" }}>
              {brand.tagline}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={`/brands/${brand.slug}/feature`}
                className="inline-block px-9 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
                style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
              >
                Read the spotlight →
              </Link>
              <Link
                href={`/brands/${brand.slug}`}
                className="inline-flex items-center gap-3 text-[12px] tracking-[0.22em] uppercase font-medium pb-1 border-b"
                style={{ borderColor: "var(--color-saffron-soft)", color: "var(--color-saffron-soft)" }}
              >
                Shop the collection →
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FeaturedDesigners({ brands }: { brands: Awaited<ReturnType<typeof getBrands>> }) {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12 lg:mb-16">
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-cobalt)" }}>Featured designers</p>
              <h2 className="display text-[clamp(1.8rem,3.4vw,3rem)] max-w-[22ch]" style={{ color: "var(--color-ink)" }}>
                Houses already on the floor.
              </h2>
            </div>
            <Link href="/brands" className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link" style={{ color: "var(--color-ink)" }}>
              All designers →
            </Link>
          </div>
        </Reveal>
        <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {brands.slice(0, 6).map(b => (
            <StaggerItem key={b.slug}>
              <Link href={`/brands/${b.slug}`} className="group block text-center">
                <div className="relative aspect-[4/5] mb-4 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
                  <Image
                    src={b.heroImage}
                    alt={b.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 16vw"
                    className="object-cover product-image"
                  />
                </div>
                <p className="serif text-base lg:text-lg" style={{ color: "var(--color-ink)" }}>{b.name}</p>
                <p className="text-[10px] tracking-[0.18em] uppercase mt-1" style={{ color: "var(--color-muted)" }}>{b.origin}</p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── Featured edit (small product grid) ─────────────────────────────────────

function FeaturedEdit({
  products,
  brandsBySlug,
  wishlistSlugs,
}: {
  products: Awaited<ReturnType<typeof getFeaturedProducts>>;
  brandsBySlug: Map<string, Awaited<ReturnType<typeof getBrands>>[number]>;
  wishlistSlugs: Set<string>;
}) {
  return (
    <section className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12 lg:mb-16">
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Chosen for the season</p>
              <h2 className="display text-[clamp(1.8rem,3.4vw,3rem)]" style={{ color: "var(--color-ink)" }}>
                A small edit.
              </h2>
            </div>
            <Link href="/new-arrivals" className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link" style={{ color: "var(--color-ink)" }}>
              See all →
            </Link>
          </div>
        </Reveal>
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-x-10 gap-y-14">
          {products.map(p => (
            <StaggerItem key={p.slug}>
              <ProductCard
                product={p}
                brand={brandsBySlug.get(p.brand)}
                inWishlist={wishlistSlugs.has(p.slug)}
              />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── Loved by community (testimonials) ──────────────────────────────────────

const testimonials: { quote: string; attribution: string }[] = [
  {
    quote: "The aso oke coat from Atelier Adunni arrived in three days. It is the most beautifully made piece I own.",
    attribution: "Tolu O. · London",
  },
  {
    quote: "Asofe is the only place I can buy from these designers and receive in the UK without the customs headache.",
    attribution: "Aminat K. · Manchester",
  },
  {
    quote: "Returns were genuinely easy. The piece I kept is everything; the one I returned was refunded the same week.",
    attribution: "Sandra A. · Birmingham",
  },
];

function LovedByCommunity() {
  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: "var(--color-blush)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="text-center mb-16 lg:mb-20">
            <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Loved by the community</p>
            <h2 className="display text-[clamp(1.8rem,3.4vw,3rem)] max-w-[22ch] mx-auto" style={{ color: "var(--color-ink)" }}>
              Notes from customers across the diaspora.
            </h2>
          </div>
        </Reveal>
        <Stagger className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {testimonials.map(t => (
            <StaggerItem key={t.attribution} className="p-8 lg:p-10" >
              <div style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)", backgroundColor: "var(--color-ground)" }} className="p-8 lg:p-10 h-full">
                <p className="serif text-xl lg:text-2xl italic leading-snug mb-8" style={{ color: "var(--color-ink)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                  {t.attribution}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── From the journal ───────────────────────────────────────────────────────

function FromTheJournal({ posts }: { posts: Awaited<ReturnType<typeof getPublishedJournalPosts>> }) {
  if (posts.length === 0) return null;
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12 lg:mb-16">
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>From the journal</p>
              <h2 className="display text-[clamp(1.8rem,3.4vw,3rem)]" style={{ color: "var(--color-ink)" }}>
                Notes from the workshops.
              </h2>
            </div>
            <Link href="/editorial" className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link" style={{ color: "var(--color-ink)" }}>
              All essays →
            </Link>
          </div>
        </Reveal>
        <Stagger className="grid md:grid-cols-3 gap-8 lg:gap-10">
          {posts.map(p => (
            <StaggerItem key={p.slug}>
              <Link href={`/editorial/${p.slug}`} className="group block">
                <div className="relative aspect-[4/5] mb-5 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
                  <Image
                    src={p.heroImage}
                    alt={p.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover product-image"
                  />
                </div>
                {p.eyebrow && <p className="eyebrow mb-2" style={{ color: "var(--color-oxblood)" }}>{p.eyebrow}</p>}
                <h3 className="serif text-xl lg:text-2xl leading-snug mb-3" style={{ color: "var(--color-ink)" }}>{p.title}</h3>
                {p.excerpt && (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{p.excerpt}</p>
                )}
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── Final "Global home" CTA ────────────────────────────────────────────────

function GlobalHomeCta() {
  return (
    <section style={{ backgroundColor: "var(--color-oxblood)", color: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-28 lg:py-40 text-center">
        <Reveal>
          <p className="eyebrow mb-8" style={{ color: "var(--color-saffron-soft)" }}>The Global Home</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="display text-[clamp(2.4rem,5vw,5rem)] leading-[1.04] tracking-[-0.01em] max-w-[20ch] mx-auto mb-10">
            The global home for African fashion.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-12" style={{ color: "rgba(255,255,255,0.78)" }}>
            One curated marketplace, eight independent designers, fulfilled from London — and growing.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/brands"
              className="inline-block px-10 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
            >
              Start browsing
            </Link>
            <Link
              href="/sellers"
              className="inline-flex items-center gap-3 text-[12px] tracking-[0.22em] uppercase font-medium pb-1 border-b"
              style={{ borderColor: "var(--color-saffron-soft)", color: "var(--color-saffron-soft)" }}
            >
              Or apply as a brand →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Icons (inline) ─────────────────────────────────────────────────────────

function IconAtelier() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9l8-5 8 5v11H4z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}
function IconReturn() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h12a5 5 0 010 10H9" />
      <path d="M7 4L3 8l4 4" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 4.5-3.4 8.5-8 9-4.6-.5-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}
