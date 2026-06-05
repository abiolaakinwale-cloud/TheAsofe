import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-32 lg:py-48" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[60rem] mx-auto px-6 lg:px-12 text-center">
        <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>404</p>
        <h1 className="display text-[clamp(2.4rem,5vw,4rem)] leading-[1.04] tracking-[-0.01em] mb-6" style={{ color: "var(--color-ink)" }}>
          This page hasn&apos;t arrived yet.
        </h1>
        <p className="text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-10" style={{ color: "var(--color-ink-soft)" }}>
          Asofe is in pre-launch. The catalogue opens once our founding cohort of designers is live.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block px-9 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Back home
          </Link>
          <Link
            href="/sellers"
            className="inline-flex items-center gap-3 px-9 py-4 text-[12px] tracking-[0.22em] uppercase font-medium border transition-colors hover:bg-[var(--color-cream)]"
            style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
          >
            Apply as a designer
          </Link>
        </div>
      </div>
    </section>
  );
}
