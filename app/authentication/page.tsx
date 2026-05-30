import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Authentication",
  description: "How Asofe verifies every piece sold on the platform, from designer onboarding to point of dispatch.",
};

const steps = [
  {
    n: "01",
    title: "Designer verification",
    body: "Every designer on the platform is interviewed by our team, supplies references from at least two existing customers or stockists, and shares a sample of work for in-person review before going live.",
  },
  {
    n: "02",
    title: "Provenance documentation",
    body: "Each piece is logged with its atelier of origin, the material composition, the artisan or weaving cluster where applicable, and the date of dispatch. The record travels with the inventory.",
  },
  {
    n: "03",
    title: "Receipt inspection at the UK hub",
    body: "Pieces are individually checked at the London hub before they go live for sale — for stitching integrity, finishing, and consistency with what the designer described in our system.",
  },
  {
    n: "04",
    title: "Authentication card with each order",
    body: "Every dispatched piece includes a small printed authentication card naming the designer, the material, the country of origin, and a reference number you can verify with us at any point.",
  },
];

export default function AuthenticationPage() {
  return (
    <>
      <PageHero
        eyebrow="Authentication"
        title="Every piece, accounted for."
        intro="A counterfeit African designer market exists. We don't trade in it. Here is how we verify the pieces on theasofe.com."
        ground="var(--color-ink)"
        inkLight
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <ol className="space-y-14">
            {steps.map(s => (
              <li key={s.n} className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-start">
                <div className="lg:col-span-2">
                  <p className="display text-4xl lg:text-5xl tabular-nums" style={{ color: "var(--color-emerald)" }}>{s.n}</p>
                </div>
                <div className="lg:col-span-10">
                  <h3 className="serif text-2xl lg:text-3xl mb-4" style={{ color: "var(--color-ink)" }}>{s.title}</h3>
                  <p className="text-base lg:text-lg leading-relaxed max-w-3xl" style={{ color: "var(--color-ink-soft)" }}>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Tactile aside — packaging detail */}
          <div className="mt-24 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative aspect-[4/5] lg:aspect-[5/6] order-2 lg:order-1" style={{ backgroundColor: "var(--color-cream)" }}>
              <Image
                src="/asofe/packaging-hangtag.png"
                alt="Asofe wrapped package with hang tag"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Every piece, sealed</p>
              <h3 className="display text-3xl lg:text-4xl mb-6" style={{ color: "var(--color-ink)" }}>
                The hang tag is the receipt.
              </h3>
              <p className="text-base lg:text-lg leading-relaxed max-w-md" style={{ color: "var(--color-ink-soft)" }}>
                Every Asofe order ships with a numbered authentication tag. Keep it — if you ever resell the piece,
                or need to confirm provenance, the tag links straight back to the atelier of origin.
              </p>
            </div>
          </div>

          <div className="mt-24 p-12 lg:p-16 text-center" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            <p className="eyebrow mb-5" style={{ color: "var(--color-saffron-soft)" }}>Buyer protection</p>
            <p className="serif text-xl lg:text-2xl italic leading-relaxed max-w-[42ch] mx-auto mb-6">
              &ldquo;If a piece you receive does not match its authentication record, return it to us. We will refund you and remove the designer from the platform.&rdquo;
            </p>
            <a href="mailto:concierge@theasofe.com" className="text-[11px] tracking-[0.22em] uppercase font-medium pb-1 border-b inline-block" style={{ borderColor: "var(--color-saffron-soft)", color: "var(--color-saffron-soft)" }}>
              Write to us →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
