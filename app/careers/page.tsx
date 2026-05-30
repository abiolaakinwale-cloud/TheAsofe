import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles and what we are looking for as Asofe grows.",
};

// When real roles open, replace this with a list. The empty-state below is the
// honest answer for now.
const openRoles: { title: string; location: string; type: string }[] = [];

export default function CareersPage() {
  return (
    <>
      <PageHero
        eyebrow="Careers"
        title="Building Asofe."
        intro="We are a small team across Lagos and London. We will grow carefully."
        ground="var(--color-emerald)"
        inkLight
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[72rem] mx-auto px-6 lg:px-12 space-y-16">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>How we work</p>
              <p className="text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                Remote-friendly, with a small in-person rhythm — Lagos team meets weekly at the atelier, London team
                meets weekly at the hub. We try to keep meetings rare and writing common.
              </p>
            </div>
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>What we look for</p>
              <p className="text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                Taste, care, ownership. The technical and operational craft can be learned; the wish to do work people
                will be proud of cannot.
              </p>
            </div>
          </div>

          <div className="pt-12 border-t" style={{ borderColor: "var(--color-rule)" }}>
            <p className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Open roles</p>
            {openRoles.length === 0 ? (
              <div className="max-w-2xl space-y-5 text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                <p>
                  We don&apos;t have open roles right now. When we do, we will list them here first.
                </p>
                <p>
                  If you read this and want to work with us anyway — particularly if you have experience in luxury
                  fashion buying, African textiles, UK 3PL operations, or product engineering — write us a short note.
                  We read everything.
                </p>
                <p>
                  <a href="mailto:careers@theasofe.com" className="lux-link text-[12px] tracking-[0.22em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
                    careers@theasofe.com →
                  </a>
                </p>
              </div>
            ) : (
              <ul className="space-y-px">
                {openRoles.map(r => (
                  <li key={r.title} className="p-6 grid grid-cols-12 items-center gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                    <p className="col-span-6 serif text-xl" style={{ color: "var(--color-ink)" }}>{r.title}</p>
                    <p className="col-span-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>{r.location}</p>
                    <p className="col-span-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>{r.type}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
