import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press kit · downloadable assets",
  description: "Asofe press kit — boilerplate, brand photography, quick facts, and press contact for journalists.",
};

type Asset = {
  src: string;
  name: string;
  description: string;
  dimensions?: string;
};

const HERO_ASSETS: Asset[] = [
  { src: "/asofe/hero-main.png",       name: "hero-main.png",       description: "Editorial hero — full lookbook shot", dimensions: "Primary brand image" },
  { src: "/asofe/hero-secondary.png",  name: "hero-secondary.png",  description: "Editorial hero — alternate" },
  { src: "/asofe/banner-contemporary.png", name: "banner-contemporary.png", description: "Contemporary designers banner" },
  { src: "/asofe/featured-bankekuku.png",  name: "featured-bankekuku.png",  description: "Designer spotlight image" },
];

const CATEGORY_ASSETS: Asset[] = [
  { src: "/asofe/category-womens.png",   name: "category-womens.png",   description: "Womenswear category" },
  { src: "/asofe/category-mens.png",     name: "category-mens.png",     description: "Menswear category" },
  { src: "/asofe/category-ankara.png",   name: "category-ankara.png",   description: "Ankara edit" },
  { src: "/asofe/category-occasion.png", name: "category-occasion.png", description: "Occasion edit" },
  { src: "/asofe/category-wedding.png",  name: "category-wedding.png",  description: "Wedding guest edit" },
  { src: "/asofe/category-designers.png", name: "category-designers.png", description: "Designer index hero" },
];

const PACKAGING_ASSETS: Asset[] = [
  { src: "/asofe/packaging-giftbox.png", name: "packaging-giftbox.png", description: "Asofe gift packaging" },
  { src: "/asofe/packaging-hangtag.png", name: "packaging-hangtag.png", description: "Authenticity hang tag" },
];

const EDITORIAL_ASSETS: Asset[] = [
  { src: "/asofe/editorial-ankara.png",   name: "editorial-ankara.png",   description: "Editorial · the Ankara feature" },
  { src: "/asofe/editorial-occasion.png", name: "editorial-occasion.png", description: "Editorial · occasion dressing" },
  { src: "/asofe/journal-card.png",       name: "journal-card.png",       description: "Editorial · journal card" },
];

const QUICK_FACTS: { k: string; v: string }[] = [
  { k: "Trading name",        v: "Asofe" },
  { k: "Legal entity",        v: "Kadd Consulting Limited" },
  { k: "Companies House no.", v: "15467682" },
  { k: "Registered office",   v: "33 Lansbury Road, Newton Leys, Bletchley, Bucks, MK3 5QP, UK" },
  { k: "Founded",             v: "2026" },
  { k: "Operating model",     v: "Multi-vendor marketplace; UK fulfilment, designer-direct" },
  { k: "Currency",            v: "GBP" },
  { k: "Designer commission", v: "70 % to designer · 30 % to Asofe" },
  { k: "Returns window",      v: "7 days, complimentary" },
  { k: "Payment processor",   v: "Stripe (merchant of record: Kadd Consulting Limited)" },
  { k: "Press contact",       v: "correspondence@theasofe.com" },
];

export default function PressKitPage() {
  return (
    <>
      <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <Link href="/press" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
            ← Press
          </Link>
          <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Press kit</p>
          <h1 className="display text-4xl lg:text-6xl mb-8 max-w-[18ch]" style={{ color: "var(--color-ink)" }}>
            Everything you need to write the piece.
          </h1>
          <p className="text-base lg:text-lg leading-relaxed max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
            Boilerplate copy, brand photography, quick facts, and the press contact. All imagery here is cleared for editorial use with attribution to <em className="serif italic">Asofe</em>. For specific designer imagery or higher-resolution files, write to{" "}
            <a className="lux-link" href="mailto:correspondence@theasofe.com" style={{ color: "var(--color-ink)" }}>correspondence@theasofe.com</a>.
          </p>
        </div>
      </section>

      {/* ─── Boilerplate ────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
          <div>
            <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Boilerplate</p>
            <h2 className="display text-3xl lg:text-4xl mb-4" style={{ color: "var(--color-ink)" }}>
              Two paragraphs you can lift.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              Short, attributable, and intentionally journalistic in tone. Either paragraph stands alone; use both if you have the column inches.
            </p>
          </div>
          <div className="space-y-8 max-w-3xl">
            <BoilerplateBlock label="Long form (≈ 80 words)">
              Asofe is a London-based marketplace for independent African luxury designers. Founded in 2026 and operated by Kadd Consulting Limited, it brings together ateliers from Lagos, Dakar, Accra, Nairobi, Marrakech, and beyond — pieces are sourced directly from the originating designer and dispatched from a UK fulfilment hub. The platform handles checkout, returns, and customs so customers across the diaspora can buy designer-direct without the cross-border friction that has historically held the industry back.
            </BoilerplateBlock>
            <BoilerplateBlock label="Short form (≈ 30 words)">
              Asofe is a London-based marketplace for independent African luxury designers. Pieces ship directly from the atelier to a UK fulfilment hub, then on to customers — designer-direct, locally returnable, GBP at checkout.
            </BoilerplateBlock>
          </div>
        </div>
      </section>

      {/* ─── Quick facts ──────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Quick facts</p>
          <h2 className="display text-3xl lg:text-4xl mb-10" style={{ color: "var(--color-ink)" }}>
            The one-pager.
          </h2>
          <dl className="grid sm:grid-cols-2 gap-x-12 gap-y-5 max-w-4xl">
            {QUICK_FACTS.map(f => (
              <div key={f.k} className="flex flex-col gap-1 border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
                <dt className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{f.k}</dt>
                <dd className="text-sm" style={{ color: "var(--color-ink)" }}>{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── Hero imagery ─────────────────────────────────────────── */}
      <AssetGrid title="Hero & spotlight" assets={HERO_ASSETS} eyebrow="Heroes" />

      {/* ─── Category imagery ─────────────────────────────────────── */}
      <AssetGrid title="Edits by category" assets={CATEGORY_ASSETS} eyebrow="Categories" ground="var(--color-ground)" />

      {/* ─── Editorial imagery ────────────────────────────────────── */}
      <AssetGrid title="Editorial features" assets={EDITORIAL_ASSETS} eyebrow="Editorial" />

      {/* ─── Packaging ───────────────────────────────────────────── */}
      <AssetGrid title="Packaging" assets={PACKAGING_ASSETS} eyebrow="Packaging" ground="var(--color-ground)" />

      {/* ─── Contact ─────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow mb-4" style={{ color: "var(--color-saffron-soft)" }}>Press contact</p>
            <h2 className="display text-3xl lg:text-5xl mb-6">
              We answer every press email ourselves.
            </h2>
            <p className="text-base leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.78)" }}>
              For interviews, designer imagery, founder access, or specific quotes — write directly and you will hear back within one working day.
            </p>
          </div>
          <div>
            <a
              href="mailto:correspondence@theasofe.com?subject=Press%20enquiry"
              className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium border"
              style={{ borderColor: "var(--color-ground)", color: "var(--color-ground)" }}
            >
              correspondence@theasofe.com →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function BoilerplateBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="p-6 lg:p-8" style={{ backgroundColor: "var(--color-ground)" }}>
      <p className="eyebrow mb-3" style={{ color: "var(--color-muted)" }}>{label}</p>
      <p className="text-base lg:text-lg leading-relaxed serif" style={{ color: "var(--color-ink)" }}>
        {children}
      </p>
    </div>
  );
}

function AssetGrid({
  title,
  eyebrow,
  assets,
  ground = "var(--color-cream)",
}: {
  title: string;
  eyebrow: string;
  assets: Asset[];
  ground?: string;
}) {
  return (
    <section className="py-20 lg:py-24 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: ground }}>
      <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
        <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>{eyebrow}</p>
        <h2 className="display text-3xl lg:text-4xl mb-10" style={{ color: "var(--color-ink)" }}>
          {title}.
        </h2>
        <ul className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {assets.map(a => (
            <li key={a.src}>
              <div className="relative aspect-[3/4] mb-4 overflow-hidden" style={{ backgroundColor: "var(--color-rule)" }}>
                <Image src={a.src} alt={a.description} fill sizes="(max-width: 1024px) 50vw, 33vw" className="object-cover" />
              </div>
              <p className="text-sm mb-1" style={{ color: "var(--color-ink)" }}>{a.description}</p>
              {a.dimensions && (
                <p className="text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--color-muted)" }}>
                  {a.dimensions}
                </p>
              )}
              <a
                href={a.src}
                download={a.name}
                className="text-[10px] tracking-[0.22em] uppercase lux-link"
                style={{ color: "var(--color-oxblood)" }}
              >
                Download ↓
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
