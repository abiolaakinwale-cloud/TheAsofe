type Props = {
  value: number;          // 0–5 (can be fractional)
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  count?: number;         // optional review count to render next to it
};

const SIZES = {
  sm: { star: 12, gap: 1 },
  md: { star: 16, gap: 2 },
  lg: { star: 20, gap: 2 },
} as const;

export default function Stars({ value, size = "md", showValue = false, count }: Props) {
  const { star, gap } = SIZES[size];
  const clamped = Math.max(0, Math.min(5, value));
  const filledWidth = (clamped / 5) * (star * 5 + gap * 4);

  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <span className="relative inline-block" aria-label={`${clamped.toFixed(1)} out of 5 stars`} style={{ width: star * 5 + gap * 4, height: star }}>
        {/* Background (empty) stars */}
        <span className="absolute inset-0 flex" style={{ gap }}>
          {[0, 1, 2, 3, 4].map(i => <Star key={i} size={star} fill="var(--color-rule)" />)}
        </span>
        {/* Foreground (filled) — clip to filled width */}
        <span className="absolute inset-0 flex overflow-hidden" style={{ gap, width: filledWidth }}>
          {[0, 1, 2, 3, 4].map(i => <Star key={i} size={star} fill="var(--color-saffron)" />)}
        </span>
      </span>
      {showValue && (
        <span className="text-xs tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
          {clamped.toFixed(1)}
        </span>
      )}
      {typeof count === "number" && (
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          {count === 0 ? "no reviews yet" : `${count} ${count === 1 ? "review" : "reviews"}`}
        </span>
      )}
    </span>
  );
}

function Star({ size, fill }: { size: number; fill: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} aria-hidden>
      <path d="M10 1.5l2.7 5.46 6.03.88-4.36 4.25 1.03 6-5.4-2.84-5.4 2.84 1.03-6L1.27 7.84l6.03-.88L10 1.5z" />
    </svg>
  );
}
