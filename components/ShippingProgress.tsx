import { FREE_SHIPPING_THRESHOLD_GBP, shippingFor } from "@/lib/shipping";
import { formatPrice } from "@/lib/data";

type Props = { subtotal: number };

export default function ShippingProgress({ subtotal }: Props) {
  const s = shippingFor(subtotal);
  const pct = Math.round(s.progress * 100);

  return (
    <div
      className="px-5 py-4 mb-6"
      style={{ backgroundColor: "var(--color-cream)" }}
      role="status"
      aria-live="polite"
    >
      <p className="text-[11px] tracking-[0.18em] uppercase mb-2" style={{ color: s.qualifies ? "var(--color-emerald)" : "var(--color-muted)" }}>
        {s.qualifies
          ? "Complimentary UK shipping unlocked"
          : `Add ${formatPrice(s.remaining)} for complimentary shipping`}
      </p>
      <div className="relative h-1.5 w-full" style={{ backgroundColor: "var(--color-rule)" }}>
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: s.qualifies ? "var(--color-emerald)" : "var(--color-ink)",
          }}
        />
      </div>
      <p className="text-[10px] mt-2" style={{ color: "var(--color-muted)" }}>
        Threshold {formatPrice(FREE_SHIPPING_THRESHOLD_GBP)} · UK addresses
      </p>
    </div>
  );
}
