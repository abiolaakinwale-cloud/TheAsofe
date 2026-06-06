import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Prose from "@/components/Prose";

export const metadata: Metadata = { title: "Shipping & Delivery" };

const regions = [
  { region: "United Kingdom", time: "Within 10 working days", cost: "Royal Mail Tracked 48" },
  { region: "Nigeria & ECOWAS", time: "Not yet available", cost: "—" },
  { region: "European Union", time: "Not yet available", cost: "—" },
  { region: "United States & Canada", time: "Not yet available", cost: "—" },
  { region: "Rest of world", time: "Not yet available", cost: "—" },
];

export default function ShippingPage() {
  return (
    <>
      <PageHero
        eyebrow="Customer Care"
        title="Shipping & Delivery."
        intro="Every piece travels insured, hand-checked, and accompanied by its papers. The notes below describe how it reaches you."
        ground="var(--color-blush)"
      />

      <section className="py-16" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-12">
          <p className="eyebrow mb-8" style={{ color: "var(--color-oxblood)" }}>Timelines & charges</p>
          <div className="border-t" style={{ borderColor: "var(--color-rule)" }}>
            {regions.map((r) => (
              <div key={r.region} className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-3 sm:gap-6 py-5 border-b" style={{ borderColor: "var(--color-rule)" }}>
                <p className="display text-lg lg:text-xl" style={{ color: "var(--color-ink)" }}>{r.region}</p>
                <p className="text-sm lg:text-base" style={{ color: "var(--color-ink-soft)" }}>{r.time}</p>
                <p className="text-sm lg:text-base sm:text-right" style={{ color: "var(--color-ink-soft)" }}>{r.cost}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Prose
        lastUpdated="June 2026"
        sections={[
          {
            heading: "From designer to door",
            body: <p>
              Each order ships through a UK-bound consolidator that departs twice weekly — Wednesday and Sunday. Designers
              hand goods to our logistics partner within 24 hours of order; Royal Mail Tracked 48 covers the final mile.
              You receive a single tracking link once the parcel is with Royal Mail.
            </p>,
          },
        ]}
      />
    </>
  );
}
