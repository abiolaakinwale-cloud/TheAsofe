type Props = {
  eyebrow: string;
  title: string;
  intro?: string;
  ground?: string;            // CSS var or hex
  inkLight?: boolean;         // text colour on dark ground
};

export default function PageHero({
  eyebrow,
  title,
  intro,
  ground = "var(--color-cream)",
  inkLight = false,
}: Props) {
  const ink = inkLight ? "var(--color-ground)" : "var(--color-ink)";
  const muted = inkLight ? "rgba(255,255,255,0.75)" : "var(--color-ink-soft)";
  const eyebrowColour = inkLight ? "var(--color-saffron-soft)" : "var(--color-oxblood)";

  return (
    <section style={{ backgroundColor: ground, color: ink }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-24 lg:py-32">
        <p className="eyebrow mb-6" style={{ color: eyebrowColour }}>{eyebrow}</p>
        <h1 className="display text-[clamp(2.6rem,6vw,5.4rem)] max-w-[20ch] mb-6">
          {title}
        </h1>
        {intro && (
          <p className="text-base lg:text-lg leading-relaxed max-w-xl" style={{ color: muted }}>
            {intro}
          </p>
        )}
      </div>
    </section>
  );
}
