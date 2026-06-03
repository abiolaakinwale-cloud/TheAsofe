"use client";

import { useState, useTransition } from "react";

type State =
  | { kind: "idle"; error: string | null }
  | { kind: "saved" };

// Renders only for guest visitors with items in the bag. Posts to
// /api/bag/email which sets the bag_email cookie + mirrors a snapshot so the
// abandonment cron can reach this visitor.
export default function GuestEmailCapture({ initialEmail }: { initialEmail?: string }) {
  const [state, setState] = useState<State>(initialEmail ? { kind: "saved" } : { kind: "idle", error: null });
  const [email, setEmail] = useState(initialEmail ?? "");
  const [pending, startTransition] = useTransition();

  if (state.kind === "saved") {
    return (
      <p className="text-[10px] tracking-[0.18em] uppercase mt-3" style={{ color: "var(--color-emerald)" }}>
        ✦ We'll save your bag for next time
      </p>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const r = await fetch("/api/bag/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await r.json();
        if (!r.ok || !data.ok) {
          setState({ kind: "idle", error: data.error ?? "Couldn't save email" });
          return;
        }
        setState({ kind: "saved" });
      } catch {
        setState({ kind: "idle", error: "Network error" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 pt-6 border-t space-y-2" style={{ borderColor: "var(--color-rule)" }}>
      <label className="block text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
        Save your bag — email it to yourself
      </label>
      <div className="flex items-center gap-2">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 h-10 border bg-transparent px-2 text-xs"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-4 text-[10px] tracking-[0.22em] uppercase font-medium border disabled:opacity-50"
          style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.error && (
        <p className="text-xs" role="alert" style={{ color: "var(--color-oxblood)" }}>{state.error}</p>
      )}
    </form>
  );
}
