import Link from "next/link";

export default function GiftCardSentPage() {
  return (
    <section className="py-24 lg:py-32 min-h-[60vh] grid place-items-center" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-xl text-center px-6">
        <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Sent</p>
        <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>
          Your gift is on its way.
        </h1>
        <p className="text-base leading-relaxed mb-10" style={{ color: "var(--color-ink-soft)" }}>
          The recipient will receive their code by email shortly. We&apos;ll send your purchase receipt to the email on your Stripe payment within the next few minutes.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Back to the floor
          </Link>
          <Link href="/gift-cards" className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
            Send another →
          </Link>
        </div>
      </div>
    </section>
  );
}
