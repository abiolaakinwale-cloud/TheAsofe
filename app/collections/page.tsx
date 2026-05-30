import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { listCollections } from "@/lib/collections";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated edits — Ankara, Occasion, Wedding Guest, Contemporary Designers.",
};

export default function CollectionsIndex() {
  const collections = listCollections();
  return (
    <>
      <section style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 pt-16 lg:pt-24 pb-8 lg:pb-12">
          <nav className="text-[10px] tracking-[0.22em] uppercase mb-4" style={{ color: "var(--color-muted)" }}>
            <Link href="/" className="lux-link">Home</Link>
            <span className="mx-3" aria-hidden>·</span>
            <span style={{ color: "var(--color-ink)" }}>Collections</span>
          </nav>
          <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>The Edits</p>
          <h1 className="display text-[clamp(2rem,5vw,4.4rem)] leading-[1.04] tracking-[-0.01em] max-w-[20ch]" style={{ color: "var(--color-ink)" }}>
            Curated edits, written and styled.
          </h1>
          <p className="text-base lg:text-lg mt-6 max-w-2xl leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Four themes we keep returning to. Each is a piece of writing, a small group of pieces, and a list of the
            designers behind them.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-16">
          {collections.map(c => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden mb-6" style={{ backgroundColor: "var(--color-cream)" }}>
                <Image
                  src={c.heroImage}
                  alt={c.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover product-image"
                />
              </div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>{c.eyebrow}</p>
              <h2 className="display text-3xl lg:text-4xl mb-4" style={{ color: "var(--color-ink)" }}>
                {c.name}.
              </h2>
              <p className="text-sm lg:text-base leading-relaxed max-w-md" style={{ color: "var(--color-ink-soft)" }}>
                {c.intro.split(". ")[0]}.
              </p>
              <p className="mt-6 text-[11px] tracking-[0.22em] uppercase font-medium lux-link inline-block" style={{ color: "var(--color-ink)" }}>
                Enter the edit →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
