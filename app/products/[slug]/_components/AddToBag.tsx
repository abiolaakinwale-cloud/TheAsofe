"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addToBag } from "@/app/bag/actions";
import HeartButton from "@/components/HeartButton";
import BackInStockButton from "@/components/BackInStockButton";
import { trackClient } from "@/components/PostHogProvider";

type Props = {
  productSlug: string;
  productName: string;
  brandSlug: string;
  price: number;
  sizes: string[];
  /** Stock keyed by `${colour}|${size}`. Pre-variants stock is under "". */
  stock: Record<string, number>;
  colours?: string[];
  defaultColour: string;
  madeToOrder?: boolean;
  leadTimeWeeks?: number;
  inWishlist?: boolean;
};

export default function AddToBag({
  productSlug,
  productName,
  brandSlug,
  price,
  sizes,
  stock,
  colours,
  defaultColour,
  madeToOrder = false,
  leadTimeWeeks,
  inWishlist = false,
}: Props) {
  const colourOptions = useMemo(() => {
    if (colours && colours.length > 0) return colours;
    return defaultColour ? [defaultColour] : [];
  }, [colours, defaultColour]);

  const [chosenColour, setChosenColour] = useState<string>(colourOptions[0] ?? defaultColour ?? "");
  const [chosenSize, setChosenSize] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // When colour changes, clear the chosen size if it's no longer in stock
  useEffect(() => {
    if (!chosenSize) return;
    const qty = stock[`${chosenColour}|${chosenSize}`] ?? 0;
    if (qty === 0 && !madeToOrder) setChosenSize(null);
  }, [chosenColour, chosenSize, stock, madeToOrder]);

  const canBackorder = madeToOrder && !!leadTimeWeeks && leadTimeWeeks > 0;

  // The stock key the server uses when there's no variant info — pre-variants
  // products are stored under colour="". Look up under that fallback too.
  function qtyFor(colour: string, size: string): number {
    return stock[`${colour}|${size}`] ?? stock[`|${size}`] ?? 0;
  }

  const totalStockForChosenColour = sizes.reduce((s, sz) => s + qtyFor(chosenColour, sz), 0);
  const allOut = totalStockForChosenColour === 0;
  const allBlocked = allOut && !canBackorder;
  const chosenIsBackorder = chosenSize ? qtyFor(chosenColour, chosenSize) === 0 && canBackorder : false;

  // Whether each colour has *any* stock — used to dim sold-out colour swatches
  function colourHasStock(c: string): boolean {
    return sizes.some(sz => qtyFor(c, sz) > 0);
  }

  function onAdd() {
    if (!chosenSize) {
      setError("Please select a size.");
      return;
    }
    setError(null);
    const variantColour = colours && colours.length > 1 ? chosenColour : "";
    trackClient("add_to_cart", {
      slug: productSlug,
      name: productName,
      brand: brandSlug,
      price,
      size: chosenSize,
      colour: variantColour || defaultColour,
      backorder: chosenIsBackorder,
    });
    startTransition(async () => {
      try {
        await addToBag(productSlug, chosenSize, variantColour);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      }
    });
  }

  const chosenStock = chosenSize ? qtyFor(chosenColour, chosenSize) : 0;
  const scarcityNote =
    chosenSize && chosenStock > 0 && chosenStock <= 2
      ? chosenStock === 1
        ? `Last one in size ${chosenSize}`
        : `Only ${chosenStock} left in size ${chosenSize}`
      : null;

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

      {/* Colour picker — only when the product has 2+ colours */}
      {colourOptions.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="eyebrow" style={{ color: "var(--color-emerald)" }}>Colour</p>
            <p className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>
              {chosenColour}
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {colourOptions.map(c => {
              const hasStock = colourHasStock(c);
              const disabled = !hasStock && !canBackorder;
              const picked = chosenColour === c;
              return (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => setChosenColour(c)}
                    disabled={disabled}
                    aria-pressed={picked}
                    className="px-4 py-2 text-xs border transition-colors disabled:cursor-not-allowed"
                    style={{
                      borderColor: picked ? "var(--color-ink)" : "var(--color-rule)",
                      backgroundColor: picked ? "var(--color-ink)" : "transparent",
                      color: picked ? "var(--color-ground)" : disabled ? "var(--color-muted)" : "var(--color-ink)",
                      textDecoration: disabled ? "line-through" : "none",
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    {c}
                  </button>
                </li>
              );
            })}
          </ul>
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
            const qty = qtyFor(chosenColour, s);
            const out = qty === 0;
            const disabled = out && !canBackorder;
            const picked = chosenSize === s;
            return (
              <li key={s}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setChosenSize(s)}
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

      {scarcityNote && (
        <p
          className="text-[11px] tracking-[0.18em] uppercase mt-3"
          style={{ color: "var(--color-oxblood)" }}
          role="status"
        >
          {scarcityNote}
        </p>
      )}

      <div className="space-y-3 pt-2" data-pdp-cta>
        {allBlocked ? (
          <BackInStockButton
            productSlug={productSlug}
            productName={productName}
            colour={colours && colours.length > 1 ? chosenColour : defaultColour}
            sizes={sizes}
            preselectedSize={chosenSize}
          />
        ) : (
          <button
            type="button"
            onClick={onAdd}
            disabled={pending}
            className="w-full py-4 text-[12px] tracking-[0.18em] uppercase font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            {pending
              ? "Adding…"
              : chosenIsBackorder
                ? `Order now · made in ${leadTimeWeeks} ${leadTimeWeeks === 1 ? "week" : "weeks"}`
                : "Add to bag"}
          </button>
        )}
        <HeartButton slug={productSlug} initial={inWishlist} size="detail" returnTo={`/products/${productSlug}`} />
        {error && (
          <p className="text-sm" style={{ color: "var(--color-oxblood)" }}>{error}</p>
        )}
      </div>
    </>
  );
}
