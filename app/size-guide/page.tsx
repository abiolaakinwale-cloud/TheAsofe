import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "International size conversion and fit notes for Asofe pieces.",
};

const womensApparel = [
  { uk: "6",   eu: "34", us: "2",   it: "38", bust: "32 / 81",  waist: "24 / 61",  hips: "34 / 86" },
  { uk: "8",   eu: "36", us: "4",   it: "40", bust: "34 / 86",  waist: "26 / 66",  hips: "36 / 91" },
  { uk: "10",  eu: "38", us: "6",   it: "42", bust: "36 / 91",  waist: "28 / 71",  hips: "38 / 96" },
  { uk: "12",  eu: "40", us: "8",   it: "44", bust: "38 / 96",  waist: "30 / 76",  hips: "40 / 101" },
  { uk: "14",  eu: "42", us: "10",  it: "46", bust: "40 / 101", waist: "32 / 81",  hips: "42 / 106" },
  { uk: "16",  eu: "44", us: "12",  it: "48", bust: "42 / 106", waist: "34 / 86",  hips: "44 / 111" },
  { uk: "18",  eu: "46", us: "14",  it: "50", bust: "44 / 111", waist: "36 / 91",  hips: "46 / 116" },
];

const mensApparel = [
  { uk: "XS / 36", chest: "36 / 91",   waist: "30 / 76" },
  { uk: "S  / 38", chest: "38 / 96",   waist: "32 / 81" },
  { uk: "M  / 40", chest: "40 / 101",  waist: "34 / 86" },
  { uk: "L  / 42", chest: "42 / 106",  waist: "36 / 91" },
  { uk: "XL / 44", chest: "44 / 111",  waist: "38 / 96" },
  { uk: "XXL/ 46", chest: "46 / 116",  waist: "40 / 101" },
];

export default function SizeGuidePage() {
  return (
    <>
      <PageHero
        eyebrow="Size guide"
        title="Finding the fit."
        intro="Sizes follow UK convention by default. Where a piece is hand-made, expect natural variance of about 2cm — designers note the specific measurements on each product page."
        ground="var(--color-saffron-soft)"
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[88rem] mx-auto px-6 lg:px-12 space-y-24">
          {/* Women's apparel */}
          <div>
            <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Women&apos;s apparel</p>
            <h2 className="display text-3xl lg:text-4xl mb-8" style={{ color: "var(--color-ink)" }}>By region.</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ color: "var(--color-ink)" }}>
                <thead>
                  <tr className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                    <Th>UK</Th><Th>EU</Th><Th>US</Th><Th>IT</Th>
                    <Th>Bust (in / cm)</Th><Th>Waist (in / cm)</Th><Th>Hips (in / cm)</Th>
                  </tr>
                </thead>
                <tbody>
                  {womensApparel.map((r, i) => (
                    <tr key={r.uk} className="border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: i % 2 ? "var(--color-cream)" : undefined }}>
                      <Td>{r.uk}</Td><Td>{r.eu}</Td><Td>{r.us}</Td><Td>{r.it}</Td>
                      <Td>{r.bust}</Td><Td>{r.waist}</Td><Td>{r.hips}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Men's apparel */}
          <div>
            <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>Men&apos;s apparel</p>
            <h2 className="display text-3xl lg:text-4xl mb-8" style={{ color: "var(--color-ink)" }}>Chest &amp; waist.</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ color: "var(--color-ink)" }}>
                <thead>
                  <tr className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                    <Th>UK</Th><Th>Chest (in / cm)</Th><Th>Waist (in / cm)</Th>
                  </tr>
                </thead>
                <tbody>
                  {mensApparel.map((r, i) => (
                    <tr key={r.uk} className="border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: i % 2 ? "var(--color-cream)" : undefined }}>
                      <Td>{r.uk}</Td><Td>{r.chest}</Td><Td>{r.waist}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl">
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>How to measure</p>
              <ul className="space-y-3 text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                <li><strong>Bust / chest</strong> — around the fullest part, tape level under the arms.</li>
                <li><strong>Waist</strong> — around the narrowest point, usually just above the navel.</li>
                <li><strong>Hips</strong> — around the fullest part, feet together.</li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>Between sizes?</p>
              <p className="text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                Most of our designers cut on the generous side. We recommend sizing down where a piece is structured (tailoring, fitted dresses) and going to your usual UK size where a piece is loose (kaftans, agbada, wide-leg trousers).
                Need a second opinion? <a href="mailto:concierge@theasofe.com" className="lux-link" style={{ color: "var(--color-ink)" }}>Ask the concierge →</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-3 px-4 text-left font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-3 px-4 tabular-nums">{children}</td>;
}
