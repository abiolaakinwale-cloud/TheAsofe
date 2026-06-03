"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/data";

type Props = {
  productName: string;
  brandName?: string;
  price: number;
  /** Optional CSS selector for the in-page CTA we mirror; falls back to scrollTo. */
  targetSelector?: string;
};

/**
 * Renders only on mobile (≤ lg). Becomes visible once the in-page add-to-bag
 * panel scrolls out of view. Clicking the bar scrolls back up to the real CTA
 * (which carries the size/colour state); this is the discovery affordance, not
 * a duplicate submit form.
 */
export default function StickyAddToBagBar({
  productName,
  brandName,
  price,
  targetSelector = "[data-pdp-cta]",
}: Props) {
  const [visible, setVisible] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const el = document.querySelector(targetSelector);
        if (!el) {
          setVisible(false);
        } else {
          const rect = el.getBoundingClientRect();
          // Show once the in-page CTA is fully above the visible window.
          setVisible(rect.bottom < 0);
        }
        ticking.current = false;
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetSelector]);

  function scrollToCta() {
    const el = document.querySelector(targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div
      className={`lg:hidden fixed bottom-0 inset-x-0 z-40 border-t transition-transform duration-200 ${visible ? "translate-y-0" : "translate-y-full"}`}
      style={{
        backgroundColor: "var(--color-ground)",
        borderColor: "var(--color-rule)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
      }}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          {brandName && (
            <p className="text-[10px] tracking-[0.18em] uppercase truncate" style={{ color: "var(--color-muted)" }}>
              {brandName}
            </p>
          )}
          <p className="text-sm truncate" style={{ color: "var(--color-ink)" }}>
            {productName}
          </p>
        </div>
        <p className="text-sm tabular-nums" style={{ color: "var(--color-ink)" }}>
          {formatPrice(price)}
        </p>
        <button
          type="button"
          onClick={scrollToCta}
          className="px-5 py-3 text-[11px] tracking-[0.22em] uppercase font-medium min-h-[44px]"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          aria-label="Jump to add-to-bag"
        >
          Add
        </button>
      </div>
    </div>
  );
}
