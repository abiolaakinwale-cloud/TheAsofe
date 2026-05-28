import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Prose from "@/components/Prose";

export const metadata: Metadata = { title: "Shipping & Delivery" };

const regions = [
  { region: "Nigeria & ECOWAS", time: "1 – 3 working days", cost: "Complimentary" },
  { region: "United Kingdom & European Union", time: "3 – 5 working days", cost: "From £25 · DDP" },
  { region: "United States & Canada", time: "4 – 7 working days", cost: "From £45 · DDP" },
  { region: "Middle East & Asia", time: "5 – 8 working days", cost: "From £55 · DDP" },
  { region: "Rest of world", time: "7 – 12 working days", cost: "Calculated at checkout" },
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
        lastUpdated="May 2026"
        sections={[
          {
            heading: "From designer to door",
            body: <p>
              Each piece is dispatched directly from its originating designer or from our Lagos atelier. We coordinate one
              consolidated shipment per order; you will receive a single tracking link once the last item is in transit.
            </p>,
          },
          {
            heading: "Duties & taxes",
            body: <p>
              For destinations marked DDP (Delivered Duty Paid) all duties, import taxes, and customs handling are
              calculated and settled at checkout. Nothing further is owed on receipt. For other destinations the carrier
              will contact you to settle local charges before final delivery.
            </p>,
          },
          {
            heading: "Made-to-measure & pre-order",
            body: <p>
              Pieces produced after order carry a lead time stated on the product page. The shipping clock begins on the
              date of dispatch, not the date of order. We will write to you when production is complete.
            </p>,
          },
          {
            heading: "Signature on delivery",
            body: <p>
              All orders require an adult signature. We are unable to leave packages with neighbours or in safe places.
              If you will not be available, the carrier will hold the parcel for collection.
            </p>,
          },
          {
            heading: "Restricted materials",
            body: <p>
              A small number of pieces incorporate horn, raffia, or naturally-shed feathers. Where local import rules
              restrict these materials we are unable to ship; the product page will note any such restrictions.
            </p>,
          },
        ]}
      />
    </>
  );
}
