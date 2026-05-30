import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import ApplicationForm from "./_components/ApplicationForm";
import Reveal, { Stagger, StaggerItem } from "./_components/Reveal";
import { getSiteSettings } from "@/lib/cms";

export const metadata: Metadata = {
  title: "For Brands — Apply to Asofe",
  description:
    "Asofe is the UK fulfilment and diaspora commerce platform for Nigerian fashion brands. Apply to join.",
};

export default async function SellersPage() {
  const settings = await getSiteSettings();
  return (
    <>
      <Hero image={settings.images.sellersHero} />
      <TrustStrip />
      <HowItWorks />
      <WhySell />
      <Metrics />
      <FormSection />
      <FinalCta />
    </>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero({ image }: { image: string }) {
  return (
    <section className="relative" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center lg:min-h-[760px] py-16 lg:py-20">
        <div className="lg:col-span-6 order-2 lg:order-1">
          <Reveal>
            <p className="eyebrow mb-8" style={{ color: "var(--color-oxblood)" }}>
              For Brands · Lagos → London
            </p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              className="display text-[clamp(2.4rem,5.4vw,5rem)] leading-[1.04] tracking-[-0.01em] mb-8 max-w-[20ch]"
              style={{ color: "var(--color-ink)" }}
            >
              Helping Nigerian fashion brands sell seamlessly to diaspora customers.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p
              className="text-base lg:text-lg leading-relaxed max-w-xl mb-12"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Asofe provides UK fulfilment, local delivery, returns handling, and access to
              customers across the diaspora — so your atelier can sell internationally without
              shipping every order from Lagos.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="#apply"
                className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
              >
                Apply as a Brand
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-3 text-[12px] tracking-[0.22em] uppercase font-medium pb-1 border-b transition-colors"
                style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
              >
                How It Works
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2 relative aspect-[4/5] lg:aspect-[4/5] lg:max-h-[720px]">
          <Reveal className="absolute inset-0">
            <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
              <Image
                src={image}
                alt="An Asofe partner brand model in studio"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            {/* Caption overlay — quietly editorial */}
            <div
              className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-10 lg:right-10 flex items-end justify-between gap-6 text-[10px] tracking-[0.22em] uppercase"
              style={{ color: "var(--color-ground)" }}
            >
              <span>Volume Seventeen · The Atelier Issue</span>
              <span className="opacity-70">01 / 24</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Trust badges ────────────────────────────────────────────────────────────

const trustBadges: { label: string; icon: ReactNode }[] = [
  { label: "UK Fulfilled",        icon: <IconWarehouse /> },
  { label: "UK Returns Address",  icon: <IconReturn /> },
  { label: "Fast UK Delivery",    icon: <IconTruck /> },
  { label: "Secure Payments",     icon: <IconShield /> },
  { label: "Diaspora Marketplace",icon: <IconGlobe /> },
];

function TrustStrip() {
  return (
    <section
      className="border-y"
      style={{
        backgroundColor: "var(--color-cream)",
        borderColor: "var(--color-rule)",
      }}
    >
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-8 lg:py-10">
        <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-8 items-center">
          {trustBadges.map(b => (
            <StaggerItem
              key={b.label}
              className="flex items-center gap-3 lg:gap-4"
            >
              <span
                className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
              >
                {b.icon}
              </span>
              <span className="text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
                {b.label}
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── How it works ────────────────────────────────────────────────────────────

const steps: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Send inventory from Nigeria",
    body: "Ship your collection to our consolidator in Lagos. We coordinate the freight and customs paperwork; you focus on the work.",
  },
  {
    n: "02",
    title: "We receive and store stock in the UK",
    body: "Your pieces are inducted at our London fulfilment centre, photographed where needed, and listed against your brand on Asofe.",
  },
  {
    n: "03",
    title: "Customers order online",
    body: "Diaspora and international shoppers buy from your house through Asofe — checkout in GBP, with local trust and familiar logistics.",
  },
  {
    n: "04",
    title: "We deliver and handle returns",
    body: "Same-week delivery across the UK and a UK returns address. Refused or returned items are inspected and returned to stock.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 lg:py-40">
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-16 lg:mb-24">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>How it works</p>
              <h2 className="display text-[clamp(2rem,4vw,3.6rem)] leading-tight tracking-[-0.01em] max-w-[14ch]" style={{ color: "var(--color-ink)" }}>
                From your atelier to her doorstep — in four steps.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 self-end">
            <Reveal delay={0.1}>
              <p className="text-base lg:text-lg leading-relaxed max-w-lg" style={{ color: "var(--color-ink-soft)" }}>
                Asofe is the infrastructure layer between your house in Lagos, Ibadan, or Abuja and a
                customer in London, Toronto, or New York. We move the cloth so you can keep cutting it.
              </p>
            </Reveal>
          </div>
        </div>

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" >
          {steps.map((s, i) => (
            <StaggerItem key={s.n} className="relative p-8 lg:p-10 transition-colors duration-500 hover:bg-[var(--color-cream)]" >
              <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }} />
              <p className="display text-4xl lg:text-5xl mb-8 tabular-nums" style={{ color: "var(--color-oxblood)" }}>{s.n}</p>
              <h3 className="serif text-xl lg:text-2xl leading-snug mb-4 pr-4" style={{ color: "var(--color-ink)" }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{s.body}</p>
              {i < steps.length - 1 && (
                <span className="hidden lg:block absolute top-12 right-0 w-6 h-px" style={{ backgroundColor: "var(--color-ink)" }} />
              )}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── Why sell ─────────────────────────────────────────────────────────────────

const benefits: { title: string; body: string }[] = [
  {
    title: "UK fulfilment support",
    body: "Bonded storage and pick-and-pack in London. No more carrying inventory cost in your studio.",
  },
  {
    title: "Access to diaspora shoppers",
    body: "A curated marketplace and editorial reach into the UK, Ireland, and the wider African diaspora.",
  },
  {
    title: "Faster customer delivery",
    body: "Two-to-three day UK delivery on stocked items. International dispatch from a single hub.",
  },
  {
    title: "Simplified international shipping",
    body: "One consolidated route from Nigeria, customs and duties handled. You ship to us; we ship to her.",
  },
  {
    title: "Returns handled locally",
    body: "A UK returns address, inspection, and restock — the friction of cross-border returns disappears for the customer.",
  },
  {
    title: "Secure payouts",
    body: "GBP and NGN settlement, transparent reconciliation, paid out twice a month against verified orders.",
  },
];

function WhySell() {
  return (
    <section className="py-28 lg:py-40 border-t" style={{ backgroundColor: "var(--color-cream)", borderColor: "var(--color-rule)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <div className="text-center mb-16 lg:mb-20">
          <Reveal>
            <p className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Why sell with Asofe</p>
            <h2 className="display text-[clamp(2rem,4vw,3.6rem)] tracking-[-0.01em] max-w-[22ch] mx-auto" style={{ color: "var(--color-ink)" }}>
              The infrastructure of an international luxury house, without the overhead.
            </h2>
          </Reveal>
        </div>

        <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-14">
          {benefits.map((b, i) => (
            <StaggerItem key={b.title} className="group">
              <div className="flex items-baseline gap-6 mb-6">
                <span className="text-[11px] tracking-[0.18em] uppercase tabular-nums" style={{ color: "var(--color-muted)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="rule flex-1" style={{ backgroundColor: "var(--color-rule)" }} />
              </div>
              <h3 className="serif text-2xl lg:text-3xl leading-snug mb-4 max-w-[22ch]" style={{ color: "var(--color-ink)" }}>
                {b.title}
              </h3>
              <p className="text-sm lg:text-base leading-relaxed max-w-md" style={{ color: "var(--color-ink-soft)" }}>
                {b.body}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

const metrics = [
  { stat: "2–3 days", label: "Average UK delivery on stocked inventory" },
  { stat: "One hub",  label: "Consolidated freight, customs, and duties" },
  { stat: "GBP £",    label: "Diaspora-trusted checkout in local currency" },
  { stat: "Local",    label: "UK returns address with same-day inspection" },
];

function Metrics() {
  return (
    <section className="py-28 lg:py-36" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <Reveal>
          <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>The case for partnership</p>
          <h2 className="display text-[clamp(2rem,4vw,3.6rem)] tracking-[-0.01em] max-w-[20ch] mb-16 lg:mb-24">
            What changes the day you join.
          </h2>
        </Reveal>
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {metrics.map(m => (
            <StaggerItem key={m.label}>
              <p className="display text-[clamp(2.4rem,5vw,4.4rem)] leading-none mb-4 tracking-[-0.02em]" style={{ color: "var(--color-saffron-soft)" }}>
                {m.stat}
              </p>
              <span className="block w-10 h-px mb-5" style={{ backgroundColor: "rgba(255,255,255,0.35)" }} />
              <p className="text-sm leading-relaxed max-w-[24ch]" style={{ color: "rgba(255,255,255,0.78)" }}>
                {m.label}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

// ─── Application form ───────────────────────────────────────────────────────

function FormSection() {
  return (
    <section id="apply" className="py-28 lg:py-40">
      <div className="max-w-[88rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-12 lg:gap-20">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="eyebrow mb-6" style={{ color: "var(--color-cobalt)" }}>Apply</p>
            <h2 className="display text-[clamp(2rem,4vw,3.6rem)] leading-tight tracking-[-0.01em] mb-8" style={{ color: "var(--color-ink)" }}>
              Apply to bring your house onto Asofe.
            </h2>
            <p className="text-base lg:text-lg leading-relaxed mb-10 max-w-md" style={{ color: "var(--color-ink-soft)" }}>
              We work with a small number of independent Nigerian fashion houses. Tell us about your atelier — we read every application.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <dl className="space-y-5 max-w-sm">
              <Aside k="01" v="Personal review by the Asofe curation team" />
              <Aside k="02" v="Reply on WhatsApp within five working days" />
              <Aside k="03" v="Onboarding call before your first inventory ships" />
            </dl>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal delay={0.15}>
            <div className="p-8 lg:p-12 border" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
              <ApplicationForm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Aside({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-6">
      <dt className="text-[11px] tracking-[0.18em] uppercase tabular-nums" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--color-oxblood)", color: "var(--color-ground)" }}
    >
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-28 lg:py-44 text-center">
        <Reveal>
          <p className="eyebrow mb-8" style={{ color: "var(--color-saffron-soft)" }}>
            Volume Seventeen · A note for founders
          </p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="display text-[clamp(2.4rem,6vw,5.6rem)] leading-[1.02] tracking-[-0.01em] max-w-[20ch] mx-auto mb-10">
            The future of African fashion commerce.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-12" style={{ color: "rgba(255,255,255,0.78)" }}>
            Build your brand globally with Asofe's fulfilment and diaspora commerce infrastructure.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <Link
            href="#apply"
            className="inline-block px-10 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
          >
            Start Selling
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Icons (inline; no lib dep) ─────────────────────────────────────────────

function IconWarehouse() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5l9-5 9 5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M8 21v-7h8v7" />
      <path d="M8 14h8" />
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
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 4.5-3.4 8.5-8 9-4.6-.5-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13 13 0 010 18M12 3a13 13 0 000 18" />
    </svg>
  );
}
