import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Press",
  description: "Press enquiries, image requests, and information for journalists writing about Asofe and the designers on our platform.",
};

export default function PressPage() {
  return (
    <>
      <PageHero
        eyebrow="Press"
        title="For the press."
        intro="If you are writing about Asofe, our designers, or the African fashion industry more broadly, we will help wherever we can."
        ground="var(--color-cobalt)"
        inkLight
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-7 space-y-10 text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>What we can help with</p>
              <ul className="space-y-3">
                <li>· Imagery from our designers&apos; collections, for editorial use</li>
                <li>· Interviews with our founder or with designers on the platform</li>
                <li>· Background on the African fashion infrastructure question we are working on</li>
                <li>· Quotes on specific pieces, materials, or houses</li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Turnaround</p>
              <p>
                We try to reply to press requests within two working days. For tight deadlines, please mark the subject
                line URGENT and include your filing time.
              </p>
            </div>
            <div>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Press kit</p>
              <p>
                Brand photography, boilerplate copy, quick facts, and the press contact are all on the{" "}
                <a href="/press/kit" className="lux-link" style={{ color: "var(--color-ink)" }}>downloadable press kit</a>.
                For specific designer imagery or higher-resolution files, write to us directly.
              </p>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="p-10 lg:p-12" style={{ backgroundColor: "var(--color-cream)" }}>
              <p className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Get in touch</p>
              <p className="display text-2xl lg:text-3xl mb-6" style={{ color: "var(--color-ink)" }}>
                Press desk.
              </p>
              <dl className="space-y-4 text-sm" style={{ color: "var(--color-ink)" }}>
                <div>
                  <dt className="text-[10px] tracking-[0.22em] uppercase mb-1" style={{ color: "var(--color-muted)" }}>Email</dt>
                  <dd>
                    <a href="mailto:press@theasofe.com" className="lux-link">press@theasofe.com</a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] tracking-[0.22em] uppercase mb-1" style={{ color: "var(--color-muted)" }}>Reply within</dt>
                  <dd>Two working days</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
