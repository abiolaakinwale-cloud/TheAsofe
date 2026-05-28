"use client";

import { useState, useTransition } from "react";
import { startCheckout } from "@/app/checkout/actions";

export default function CheckoutButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await startCheckout();
        if (r && r.ok === false) setError(r.error);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="w-full mt-8 py-4 text-[12px] tracking-[0.18em] uppercase font-medium transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-wait"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
      >
        {pending ? "Opening Stripe…" : "Proceed to checkout"}
      </button>
      {error && (
        <p className="text-sm mt-4" style={{ color: "var(--color-oxblood)" }}>{error}</p>
      )}
    </>
  );
}
