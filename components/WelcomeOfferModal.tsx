"use client";

import { useEffect, useRef, useState } from "react";
import { trackClient } from "@/components/PostHogProvider";

const STORAGE_KEY = "asofe.welcome.seen";
const COOLDOWN_DAYS = 30;
const DELAY_MS = 14_000;          // 14s on-page time
const SCROLL_PCT = 0.45;          // 45% scroll depth

type State =
  | { kind: "hidden" }
  | { kind: "form"; submitting: boolean; error: string | null }
  | { kind: "success"; code: string; percent: number };

export default function WelcomeOfferModal() {
  const [state, setState] = useState<State>({ kind: "hidden" });
  const [email, setEmail] = useState("");
  const dismissed = useRef(false);

  function open() {
    if (dismissed.current) return;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const seenAt = Number(raw);
        if (Number.isFinite(seenAt) && Date.now() - seenAt < COOLDOWN_DAYS * 86_400_000) return;
      }
    } catch { /* localStorage blocked — show anyway */ }
    dismissed.current = true;
    setState({ kind: "form", submitting: false, error: null });
    trackClient("welcome_modal_opened", {});
  }

  function markSeen() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  function close() {
    markSeen();
    setState({ kind: "hidden" });
    trackClient("welcome_modal_dismissed", {});
  }

  // Triggers: scroll depth OR dwell timer OR exit-intent (desktop).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timeout = window.setTimeout(open, DELAY_MS);

    function onScroll() {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (window.scrollY / max >= SCROLL_PCT) open();
    }
    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0 && window.innerWidth >= 1024) open();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  // Escape to close
  useEffect(() => {
    if (state.kind === "hidden") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.kind]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "form", submitting: true, error: null });
    try {
      const r = await fetch("/api/discount/welcome", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setState({ kind: "form", submitting: false, error: data.error ?? "Could not issue code" });
        return;
      }
      markSeen();
      trackClient("welcome_code_issued", { percent: data.percent });
      setState({ kind: "success", code: data.code, percent: data.percent });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setState({ kind: "form", submitting: false, error: msg });
    }
  }

  if (state.kind === "hidden") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-[60] grid place-items-center px-6"
      style={{ backgroundColor: "rgba(20, 18, 16, 0.55)", backdropFilter: "blur(2px)" }}
      onClick={close}
    >
      <div
        className="relative w-full max-w-md p-8 lg:p-10"
        style={{ backgroundColor: "var(--color-ground)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close offer"
          className="absolute top-3 right-3 w-10 h-10 text-2xl leading-none"
          style={{ color: "var(--color-muted)" }}
        >×</button>

        {state.kind === "form" ? (
          <>
            <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>A welcome from Asofe</p>
            <h2 id="welcome-title" className="display text-3xl lg:text-4xl mb-4" style={{ color: "var(--color-ink)" }}>
              10% off your first piece.
            </h2>
            <p className="text-base leading-relaxed mb-7" style={{ color: "var(--color-ink-soft)" }}>
              A single code, applied at checkout. We'll also send the occasional letter — new collections, atelier visits, no spam.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-12 border bg-transparent px-3 text-base"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                disabled={state.submitting}
              />
              <button
                type="submit"
                disabled={state.submitting}
                className="w-full py-4 text-[12px] tracking-[0.22em] uppercase font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
              >
                {state.submitting ? "Sending…" : "Send me 10% off"}
              </button>
              {state.error && (
                <p className="text-sm" role="alert" style={{ color: "var(--color-oxblood)" }}>{state.error}</p>
              )}
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                One-time discount · valid 30 days · UK & international orders.
              </p>
            </form>
          </>
        ) : (
          <>
            <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Welcome aboard</p>
            <h2 id="welcome-title" className="display text-3xl mb-4" style={{ color: "var(--color-ink)" }}>
              {state.percent}% off — your code.
            </h2>
            <div
              className="p-5 mb-5 text-center font-mono text-lg tracking-[0.18em]"
              style={{ backgroundColor: "var(--color-cream)", color: "var(--color-ink)" }}
            >
              {state.code}
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--color-ink-soft)" }}>
              We've also emailed this to you. Apply it at the bag — valid 30 days, single use.
            </p>
            <a
              href="/brands"
              onClick={close}
              className="block w-full py-4 text-center text-[12px] tracking-[0.22em] uppercase font-medium"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
            >
              Browse the designers
            </a>
          </>
        )}
      </div>
    </div>
  );
}
