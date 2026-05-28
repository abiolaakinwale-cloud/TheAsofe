import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "The concierge",
  description: "Personal styling, sizing, gifting, and special-order requests from independent African designers.",
};

const services = [
  {
    label: "Personal styling",
    body: "Tell us the occasion or the wardrobe gap. We'll send back a short edit of pieces from the designers on the floor, with sizing and provenance notes.",
  },
  {
    label: "Sizing & alterations",
    body: "Several of our designers offer made-to-measure on aso oke, bazin, and tailoring. We'll liaise with the atelier and coordinate the fitting in London.",
  },
  {
    label: "Special orders",
    body: "Looking for a particular print, palette, or piece you've seen elsewhere from one of our houses? Tell us and we'll see what can be sourced.",
  },
  {
    label: "Gifting",
    body: "We arrange wrapped delivery and discreet card notes. Volume orders, hampers, and bespoke gifting briefs are welcome.",
  },
];

export default function ConciergePage() {
  return (
    <>
      <PageHero
        eyebrow="The Concierge"
        title="A private door into the catalogue."
        intro="A small team — based in London and Lagos — available by email and WhatsApp for the kind of decisions a search bar can't help with."
        ground="var(--color-emerald)"
        inkLight
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div>
            <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>What we do</p>
            <ul className="space-y-10">
              {services.map(s => (
                <li key={s.label}>
                  <h3 className="serif text-2xl mb-3" style={{ color: "var(--color-ink)" }}>{s.label}</h3>
                  <p className="text-base leading-relaxed max-w-md" style={{ color: "var(--color-ink-soft)" }}>{s.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="lg:sticky lg:top-32 p-10 lg:p-14" style={{ backgroundColor: "var(--color-cream)" }}>
            <p className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Get in touch</p>
            <h3 className="display text-3xl mb-6" style={{ color: "var(--color-ink)" }}>
              Write to the concierge.
            </h3>
            <p className="text-base leading-relaxed mb-8" style={{ color: "var(--color-ink-soft)" }}>
              The fastest way is email. We reply within one working day.
            </p>

            <dl className="space-y-5 text-sm" style={{ color: "var(--color-ink)" }}>
              <Row k="Email">
                <a href="mailto:concierge@theasofe.com" className="lux-link" style={{ color: "var(--color-ink)" }}>
                  concierge@theasofe.com
                </a>
              </Row>
              <Row k="WhatsApp">+44 (0)20 7946 0000</Row>
              <Row k="Hours">Mon–Sat · 09.00–19.00 WAT</Row>
            </dl>

            <Link
              href="mailto:concierge@theasofe.com"
              className="inline-block mt-10 px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
            >
              Write to us →
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="relative aspect-[4/5] lg:aspect-[5/6]" style={{ backgroundColor: "var(--color-ground)" }}>
            <Image
              src="/asofe/editorial-occasion.png"
              alt="A couple in occasion wear"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>Occasion dressing</p>
            <h2 className="display text-3xl lg:text-4xl mb-6" style={{ color: "var(--color-ink)" }}>
              Wedding-guest looks, planned ahead.
            </h2>
            <p className="text-base lg:text-lg leading-relaxed mb-6 max-w-lg" style={{ color: "var(--color-ink-soft)" }}>
              Tell us the date, the dress code, and the climate. We&apos;ll send a private edit — usually within 24 hours —
              with sizes confirmed, photos of the actual pieces in stock, and a hold for as long as you need to decide.
            </p>
            <Link href="mailto:concierge@theasofe.com?subject=Occasion%20edit" className="lux-link text-[12px] tracking-[0.22em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
              Brief us →
            </Link>
          </div>
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
