"use client";

import { useState, useTransition } from "react";
import { addToBag } from "@/app/bag/actions";

type Props = {
  productSlug: string;
  sizes: string[];
  stock: Record<string, number>;
};

export default function AddToBag({ productSlug, sizes, stock }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalStock = sizes.reduce((s, sz) => s + (stock[sz] ?? 0), 0);
  const allOut = totalStock === 0;

  function onAdd() {
    if (!chosen) {
      setError("Please select a size.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addToBag(productSlug, chosen);
      } catch (e: unknown) {
        // Server actions throw redirects as errors in some build modes — they're fine.
        // Anything else is a real failure.
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("NEXT_REDIRECT")) {
          setError(msg);
        }
      }
    });
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="eyebrow" style={{ color: "var(--color-emerald)" }}>Select size</p>
          <button type="button" className="text-[11px] tracking-[0.14em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
            Size guide
          </button>
        </div>
        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sizes.map(s => {
            const qty = stock[s] ?? 0;
            const out = qty === 0;
            const picked = chosen === s;
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={out}
                  onClick={() => setChosen(s)}
                  aria-pressed={picked}
                  className="w-full py-3.5 text-sm border transition-colors relative disabled:cursor-not-allowed"
                  style={{
                    borderColor: picked ? "var(--color-ink)" : "var(--color-rule)",
                    backgroundColor: picked ? "var(--color-ink)" : "transparent",
                    color: picked ? "var(--color-ground)" : out ? "var(--color-muted)" : "var(--color-ink)",
                    textDecoration: out ? "line-through" : "none",
                    opacity: out ? 0.6 : 1,
                  }}
                >
                  {s}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={onAdd}
          disabled={pending || allOut}
          className="w-full py-4 text-[12px] tracking-[0.18em] uppercase font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
        >
          {allOut ? "Sold out" : pending ? "Adding…" : "Add to bag"}
        </button>
        <button
          type="button"
          disabled
          className="w-full py-4 text-[12px] tracking-[0.18em] uppercase font-medium border opacity-40 cursor-not-allowed"
          style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
        >
          Save to wishlist
        </button>
        {error && (
          <p className="text-sm" style={{ color: "var(--color-oxblood)" }}>{error}</p>
        )}
      </div>
    </>
  );
}
