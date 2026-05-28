import type { ReactNode } from "react";

type Section = { heading?: string; body: ReactNode };

export default function Prose({ sections, lastUpdated }: { sections: Section[]; lastUpdated?: string }) {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        {lastUpdated && (
          <p className="eyebrow mb-10" style={{ color: "var(--color-muted)" }}>
            Last updated · {lastUpdated}
          </p>
        )}
        <div className="space-y-12">
          {sections.map((s, i) => (
            <div key={i}>
              {s.heading && (
                <h2 className="display text-2xl lg:text-3xl mb-4" style={{ color: "var(--color-ink)" }}>
                  {s.heading}
                </h2>
              )}
              <div className="space-y-4 text-base lg:text-[1.05rem] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
