"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-7 py-3.5 text-[12px] tracking-[0.22em] uppercase font-medium border"
      style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
    >
      Print pick list
    </button>
  );
}
