"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SearchOverlay({ open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center"
      style={{ backgroundColor: "rgba(26,24,21,0.75)" }}
      onClick={onClose}
      aria-modal
      role="dialog"
    >
      <div
        className="w-full max-w-3xl mt-[10vh] mx-6 p-8 lg:p-12"
        style={{ backgroundColor: "var(--color-ground)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between mb-6">
          <p className="eyebrow" style={{ color: "var(--color-oxblood)" }}>The drawer</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="text-[11px] tracking-[0.18em] uppercase lux-link"
            style={{ color: "var(--color-muted)" }}
          >
            Close · Esc
          </button>
        </div>

        <form action="/search" method="get">
          <label className="block">
            <span className="sr-only">Search</span>
            <input
              ref={inputRef}
              type="search"
              name="q"
              placeholder="aso oke, Marrakech, evening jacket…"
              className="w-full bg-transparent border-b py-4 text-2xl outline-none focus:border-[var(--color-ink)] serif italic"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
          </label>
          <p className="mt-4 text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
            Press Enter to search · names, materials, designers, colours.
          </p>
        </form>
      </div>
    </div>
  );
}
