import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Care Guide",
  description: "How to care for handwoven aso oke, bazin riche, kente, mud cloth, and the other textiles found on Asofe.",
};

const guides = [
  {
    label: "Aso oke",
    body: "Hand-woven on narrow looms in southwest Nigeria, aso oke holds its shape best with cool, dry storage and a gentle steam rather than ironing. For light marks, blot with a damp cloth and air-dry flat. Take heavily soiled pieces to a dry-cleaner familiar with West-African textiles.",
  },
  {
    label: "Bazin riche",
    body: "Bazin is calendered cotton with a distinctive sheen achieved by pounding. Avoid pressing directly with a hot iron, which can dull the lustre. Hand-wash in cold water with a mild detergent; do not wring. Hang to dry away from direct sunlight.",
  },
  {
    label: "Kente",
    body: "Traditional kente strips are silk or rayon woven on a four-heddle loom. Always dry-clean. Store folded with acid-free tissue in a breathable garment bag. Refold along a different line every six months to prevent permanent creases.",
  },
  {
    label: "Mud cloth (bògòlanfini)",
    body: "Hand-dyed with fermented mud over plant pigments. The pattern is permanent; the dye darkens slightly with age. Hand-wash in cold water, gentle detergent, no bleach. Lay flat to dry. Iron only on the reverse, on the cotton setting.",
  },
  {
    label: "Leather (Marrakech & Lagos ateliers)",
    body: "Wipe with a soft dry cloth after wear. Treat with a neutral leather cream every three to four months. Stuff bags with the included filler to retain shape. Keep away from sustained sunlight and radiators.",
  },
  {
    label: "Hand-loomed cotton (Habesha, Maasai)",
    body: "Cold hand-wash with a delicate detergent; or machine-wash on the wool/delicates cycle in a mesh bag. Reshape while damp. Avoid the tumble dryer. Light iron on the reverse if needed.",
  },
];

export default function CarePage() {
  return (
    <>
      <PageHero
        eyebrow="Care guide"
        title="Looking after the cloth."
        intro="Each textile in our catalogue has its own grammar. Below: how to care for the most common materials our designers work with, so the pieces hold their first beauty for years."
        ground="var(--color-cream)"
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12">
          <ul className="grid lg:grid-cols-2 gap-x-16 gap-y-14">
            {guides.map(g => (
              <li key={g.label}>
                <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>{g.label}</p>
                <p className="text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                  {g.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-20 pt-12 border-t max-w-2xl" style={{ borderColor: "var(--color-rule)" }}>
            <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Unsure?</p>
            <p className="text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              When in doubt, write to{" "}
              <a href="mailto:concierge@theasofe.com" className="lux-link" style={{ color: "var(--color-ink)" }}>concierge@theasofe.com</a>{" "}
              with a photo of the piece. We will ask the originating atelier and reply within one working day.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
