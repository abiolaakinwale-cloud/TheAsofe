import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Contact" };

const channels = [
  {
    label: "The Concierge",
    desc: "Personal shopping, made-to-measure, special orders, and discreet advice on the wardrobe.",
    detail: "concierge@theasofe.com",
    href: "mailto:concierge@theasofe.com",
    hours: "Monday – Saturday · 09.00 – 19.00 WAT",
    ground: "var(--color-emerald)",
  },
  {
    label: "Client Care",
    desc: "Orders, shipping, returns, and any after-sale matters.",
    detail: "correspondance@theasofe.com",
    href: "mailto:correspondance@theasofe.com",
    hours: "Monday – Friday · 09.00 – 18.00 WAT",
    ground: "var(--color-cobalt)",
  },
  {
    label: "Press & Partnerships",
    desc: "Editorial enquiries, image requests, and collaborations with our designers.",
    detail: "press@theasofe.com",
    href: "mailto:press@theasofe.com",
    hours: "Replies within two working days",
    ground: "var(--color-oxblood)",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Correspondence"
        title="Write to us."
        intro="We answer every letter ourselves. Whether you are searching for a particular piece, planning a private fitting, or writing about our designers, you will find the right desk below."
        ground="var(--color-cobalt)"
        inkLight
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-3 gap-px" style={{ backgroundColor: "var(--color-rule)" }}>
          {channels.map((c) => (
            <div key={c.label} className="p-10 lg:p-14" style={{ backgroundColor: c.ground, color: "var(--color-ground)" }}>
              <p className="eyebrow mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>{c.label}</p>
              <p className="display text-2xl lg:text-3xl mb-6 leading-snug">{c.desc}</p>
              <a href={c.href} className="lux-link block text-base mb-3" style={{ color: "var(--color-ground)" }}>{c.detail}</a>
              <p className="text-[12px] tracking-[0.14em] uppercase" style={{ color: "rgba(255,255,255,0.55)" }}>{c.hours}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-cream)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>The Atelier</p>
            <h2 className="display text-3xl lg:text-5xl mb-6 leading-tight">Visit by appointment.</h2>
            <p className="text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              Our Lagos atelier holds a rotating selection from each designer. Pieces may be tried, commissioned, or
              collected in person. We schedule one appointment at a time so that the room is yours.
            </p>
          </div>
          <div className="text-base lg:text-lg leading-relaxed space-y-6" style={{ color: "var(--color-ink-soft)" }}>
            <div>
              <p className="eyebrow mb-2" style={{ color: "var(--color-muted)" }}>Address</p>
              <p className="display text-2xl">12 Awolowo Road<br />Ikoyi, Lagos 101233</p>
            </div>
            <div>
              <p className="eyebrow mb-2" style={{ color: "var(--color-muted)" }}>Hours</p>
              <p>By appointment, Tuesday – Saturday</p>
            </div>
            <div>
              <p className="eyebrow mb-2" style={{ color: "var(--color-muted)" }}>To arrange</p>
              <p>
                <a href="mailto:atelier@theasofe.com" className="lux-link" style={{ color: "var(--color-oxblood)" }}>
                  atelier@theasofe.com
                </a>{" "}· +234 1 270 4400
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
