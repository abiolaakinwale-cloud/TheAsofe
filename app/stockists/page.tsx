import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { getSiteSettings } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Stockists & showroom",
  description: "How to see and try pieces from Asofe's designers in person — London hub, Lagos atelier, and seasonal events.",
};

const points = [
  {
    label: "London fulfilment hub",
    body: "Most stocked pieces ship from our small London hub. By-appointment viewings can be arranged via the concierge — typically two working days' notice for a private hour.",
  },
  {
    label: "Lagos atelier",
    body: "Our Lagos team holds a rotating selection from each designer. Pieces may be tried, commissioned, or photographed for a client review back to London.",
  },
  {
    label: "Seasonal pop-ups",
    body: "We host two or three small pop-ups a year — Brixton, Peckham, Manchester. Subscribers to the journal are the first to hear.",
  },
];

export default async function StockistsPage() {
  const settings = await getSiteSettings();
  return (
    <>
      <PageHero
        eyebrow="In person"
        title="Where to find us."
        intro="Asofe is online-first, but a handful of pieces from each designer live in physical hands. Here is how to see them."
        ground="var(--color-cobalt)"
        inkLight
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-3 gap-10 lg:gap-14">
          {points.map(p => (
            <div key={p.label} className="border-t pt-8" style={{ borderColor: "var(--color-rule)" }}>
              <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>{p.label}</p>
              <p className="text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>Book a viewing</p>
            <h2 className="display text-3xl lg:text-4xl mb-6" style={{ color: "var(--color-ink)" }}>
              The London hub, by appointment.
            </h2>
            <p className="text-base lg:text-lg leading-relaxed mb-6 max-w-lg" style={{ color: "var(--color-ink-soft)" }}>
              Tell us which pieces you&apos;d like to see (slug, designer, or simply a description), and we&apos;ll
              arrange a private hour in a quiet room. Refreshments included. No purchase expected.
            </p>
            <dl className="space-y-3 mb-10 text-sm" style={{ color: "var(--color-ink)" }}>
              <Row k="Hours">Tues–Sat · 11.00–18.00</Row>
              <Row k="Notice">Typically 2 working days</Row>
              <Row k="Where">A short walk from Liverpool Street · address shared on booking</Row>
            </dl>
            <Link
              href="mailto:concierge@theasofe.com?subject=London%20viewing%20request"
              className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
            >
              Request a viewing →
            </Link>
          </div>
          <div className="relative aspect-[4/5] lg:aspect-[5/6]" style={{ backgroundColor: "var(--color-ground)" }}>
            <Image
              src={settings.images.stockistsFeature}
              alt="An Asofe gift box and thank-you card"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-20 lg:py-28 text-center">
          <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>Hear first</p>
          <h2 className="display text-3xl lg:text-4xl max-w-[20ch] mx-auto mb-6">
            Pop-ups and trunk shows.
          </h2>
          <p className="text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-10" style={{ color: "rgba(255,255,255,0.78)" }}>
            We host a small handful of in-person events each year. Subscribers to the journal hear about them first —
            no spam, no marketing list churn.
          </p>
          <Link href="/editorial" className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}>
            Read the journal →
          </Link>
        </div>
      </section>
    </>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <dt className="text-[10px] tracking-[0.18em] uppercase w-24 flex-shrink-0" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}
