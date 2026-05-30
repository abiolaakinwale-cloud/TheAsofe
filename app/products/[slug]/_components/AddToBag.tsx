"use client";

import { useState, useTransition } from "react";
import { addToBag } from "@/app/bag/actions";
import HeartButton from "@/components/HeartButton";

type Props = {
  productSlug: string;
  sizes: string[];
  stock: Record<string, number>;
  madeToOrder?: boolean;
  leadTimeWeeks?: number;
  inWishlist?: boolean;
};

export default function AddToBag({ productSlug, sizes, stock, madeToOrder = false, leadTimeWeeks, inWishlist = false }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canBackorder = madeToOrder && !!leadTimeWeeks && leadTimeWeeks > 0;
  const totalStock = sizes.reduce((s, sz) => s + (stock[sz] ?? 0), 0);
  const allOut = totalStock === 0;
  const allBlocked = allOut && !canBackorder;
  const chosenIsBackorder = chosen ? (stock[chosen] ?? 0) === 0 && canBackorder : false;

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
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("NEXT_REDIRECT")) {
          setError(msg);
        }
      }
    });
  }

  return (
    <>
      {canBackorder && (
        <div
          className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 text-[10px] tracking-[0.22em] uppercase"
          style={{ backgroundColor: "var(--color-emerald)", color: "var(--color-ground)" }}
        >
          <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-saffron-soft)" }} />
          Made to order · ships in {leadTimeWeeks} {leadTimeWeeks === 1 ? "week" : "weeks"}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="eyebrow" style={{ color: "var(--color-emerald)" }}>Select size</p>
          <a href="/size-guide" className="text-[11px] tracking-[0.14em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
            Size guide
          </a>
        </div>
        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sizes.map(s => {
            const qty = stock[s] ?? 0;
            const out = qty === 0;
            const disabled = out && !canBackorder;
            const picked = chosen === s;
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setChosen(s)}
                  aria-pressed={picked}
                  className="w-full py-3.5 text-sm border transition-colors relative disabled:cursor-not-allowed"
                  style={{
                    borderColor: picked ? "var(--color-ink)" : "var(--color-rule)",
                    backgroundColor: picked ? "var(--color-ink)" : "transparent",
                    color: picked
                      ? "var(--color-ground)"
                      : disabled
                        ? "var(--color-muted)"
                        : "var(--color-ink)",
                    textDecoration: disabled ? "line-through" : "none",
                    opacity: disabled ? 0.6 : 1,
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
          disabled={pending || allBlocked}
          className="w-full py-4 text-[12px] tracking-[0.18em] uppercase font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
        >
          {allBlocked
            ? "Sold out"
            : pending
              ? "Adding…"
              : chosenIsBackorder
                ? `Order now · made in ${leadTimeWeeks} ${leadTimeWeeks === 1 ? "week" : "weeks"}`
                : "Add to bag"}
        </button>
        <HeartButton slug={productSlug} initial={inWishlist} size="detail" returnTo={`/products/${productSlug}`} />
        {error && (
          <p className="text-sm" style={{ color: "var(--color-oxblood)" }}>{error}</p>
        )}
      </div>
    </>
  );
}
