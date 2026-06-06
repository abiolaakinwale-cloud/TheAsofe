import type { ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSiteSettings, getPublishedJournalPosts } from "@/lib/cms";
import { getCategories } from "@/lib/queries";
import NewsletterForm from "@/components/NewsletterForm";
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
};

export default async function HomePage() {
  const [settings, journalPosts, categories] = await Promise.all([
    getSiteSettings(),
    getPublishedJournalPosts(),
    getCategories(),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <Hero settings={settings} />
      <Mission />
      <ProposedDepartments categories={categories} />
      <WhatWereBuilding />
      <SellerBand image={settings.images.sellersBand} />
      <Waitlist />
      <FromTheJournal posts={journalPosts.slice(0, 3)} />
      <OpeningSoon />
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  "UK Fulfilment",
  "Verified Designers",
  "GBP Checkout",
  "UK Returns",
];

function Hero({ settings }: { settings: Awaited<ReturnType<typeof getSiteSettings>> }) {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center lg:min-h-[780px] py-16 lg:py-24">
        <div className="lg:col-span-6 order-2 lg:order-1">
          <Reveal>
            <p className="eyebrow mb-8" style={{ color: "var(--color-oxblood)" }}>
              {settings.hero.eyebrow}
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
            <div className="hidden lg:flex absolute bottom-6 right-6 items-center gap-3 px-5 py-3 text-[10px] tracking-[0.22em] uppercase font-medium backdrop-blur" style={{ backgroundColor: "rgba(26,24,21,0.78)", color: "var(--color-ground)" }}>
              <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-emerald)" }} />
              Opening Soon · Founding Season
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Mission ─────────────────────────────────────────────────────────────────

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
              Connecting African creativity with the world.
            </h2>
          </Reveal>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-3">
          <Stagger className="space-y-7 text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            <StaggerItem>
              <p>
                African designers make some of the most considered clothing in the world. Until now, the route from a
                Lagos atelier to a London wardrobe has meant weeks of waiting, customs paperwork, and a leap of faith
                on returns.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p>
                Asofe is the infrastructure that closes that gap — UK stockholding, UK returns, GBP checkout, verified
                designers. Pieces designed in Africa, fulfilled locally, sold at prices that reflect the maker, not the
                markup.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p>
                We&apos;re onboarding our founding cohort now. If you make, sell, or want to wear African fashion in the
                UK — we&apos;d like to hear from you.
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="pt-4">
                <Link
                  href="/sellers"
                  className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link"
                  style={{ color: "var(--color-ink)" }}
                >
                  Apply as a founding designer →
                </Link>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </div>
    </section>
  );
}

// ─── Proposed departments ───────────────────────────────────────────────────

function ProposedDepartments({ categories }: { categories: Awaited<ReturnType<typeof getCategories>> }) {
  if (categories.length === 0) return null;
  return (
    <section className="py-24 lg:py-32 border-t" style={{ backgroundColor: "var(--color-ground)", borderColor: "var(--color-rule)" }}>
      <div className="max-w-[88rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="text-center mb-12 lg:mb-16 max-w-[44ch] mx-auto">
            <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Departments at launch</p>
            <h2 className="display text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.06] tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>
              What we&apos;ll be carrying.
            </h2>
          </div>
        </Reveal>
        <Stagger className="flex flex-wrap justify-center gap-3 lg:gap-4 max-w-[60rem] mx-auto">
          {categories.map(c => (
            <StaggerItem key={c.slug}>
              <span
                className="inline-block px-6 py-3 text-[12px] tracking-[0.22em] uppercase font-medium border"
                style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
              >
                {c.name}
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── What we're building ────────────────────────────────────────────────────

const buildingPoints: { title: string; body: string; icon: ReactNode }[] = [
  { title: "UK fulfilment",       body: "Stockholding from a London hub once designers list — no cross-border surprises, no customs bills on the doorstep.", icon: <IconTruck /> },
  { title: "UK returns",          body: "A UK returns address, handled locally. Refunds processed once the return is received and inspected.", icon: <IconReturn /> },
  { title: "Verified designers",  body: "Every house on the floor will be vetted by our team. Provenance is documented; counterfeits don't make it in.", icon: <IconShield /> },
  { title: "Secure GBP checkout", body: "Pay in pounds with cards, Apple Pay, or Google Pay. Payment infrastructure handled by Stripe.", icon: <IconCard /> },
];

function WhatWereBuilding() {
  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <div className="text-center mb-16 lg:mb-20 max-w-[44ch] mx-auto">
            <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>What we&apos;re building</p>
            <h2 className="display text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.06] tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>
              The infrastructure for African fashion to travel.
            </h2>
          </div>
        </Reveal>
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px max-w-[88rem] mx-auto" style={{ backgroundColor: "var(--color-rule)" }}>
          {buildingPoints.map(p => (
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
            <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>For designers</p>
            <h2 className="display text-[clamp(2rem,4.4vw,4rem)] leading-[1.06] tracking-[-0.01em] mb-8 max-w-[18ch]">
              Built for African fashion brands ready to scale globally.
            </h2>
            <p className="text-base lg:text-lg leading-relaxed max-w-lg mb-10" style={{ color: "rgba(255,255,255,0.78)" }}>
              UK fulfilment, returns handling, and access to diaspora shoppers — so your atelier can sell internationally
              without shipping every order from Lagos. We&apos;re selecting our founding cohort now.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/sellers"
                className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
              >
                Apply as a founding designer
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

// ─── Waitlist ───────────────────────────────────────────────────────────────

function Waitlist() {
  return (
    <section id="waitlist" className="py-24 lg:py-32" style={{ backgroundColor: "var(--color-blush)" }}>
      <div className="max-w-[88rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <Reveal>
          <p className="eyebrow mb-5" style={{ color: "var(--color-oxblood)" }}>Be first when we open</p>
          <h2 className="display text-[clamp(2rem,4vw,3.6rem)] leading-[1.06] tracking-[-0.01em] max-w-[18ch] mb-6" style={{ color: "var(--color-ink)" }}>
            Join the Asofe waitlist.
          </h2>
          <p className="text-base lg:text-lg leading-relaxed max-w-lg" style={{ color: "var(--color-ink-soft)" }}>
            One quiet email when our founding designers go live, with first access to the floor. No catalogue spam.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <NewsletterForm />
        </Reveal>
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

// ─── Opening soon CTA ───────────────────────────────────────────────────────

function OpeningSoon() {
  return (
    <section style={{ backgroundColor: "var(--color-oxblood)", color: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-28 lg:py-40 text-center">
        <Reveal>
          <p className="eyebrow mb-8" style={{ color: "var(--color-saffron-soft)" }}>Opening Soon</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="display text-[clamp(2.4rem,5vw,5rem)] leading-[1.04] tracking-[-0.01em] max-w-[20ch] mx-auto mb-10">
            Asofe is opening soon.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-12" style={{ color: "rgba(255,255,255,0.78)" }}>
            A founding cohort of independent African designers, fulfilled from London. Apply to join, or be first when
            the doors open.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sellers"
              className="inline-block px-10 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
            >
              Apply as a designer
            </Link>
            <Link
              href="#waitlist"
              className="inline-flex items-center gap-3 text-[12px] tracking-[0.22em] uppercase font-medium pb-1 border-b"
              style={{ borderColor: "var(--color-saffron-soft)", color: "var(--color-saffron-soft)" }}
            >
              Join the waitlist →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Icons (inline) ─────────────────────────────────────────────────────────

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
