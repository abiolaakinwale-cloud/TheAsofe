"use client";

import { useState, useTransition } from "react";
import { subscribeBackInStockAction } from "@/app/api/back-in-stock/actions";

type Props = {
  productSlug: string;
  productName: string;
  colour: string;
  sizes: string[];
  preselectedSize: string | null;
};

type State =
  | { kind: "idle" }
  | { kind: "form"; size: string; email: string; error: string | null }
  | { kind: "success"; alreadySubscribed: boolean };

export default function BackInStockButton({
  productSlug,
  productName,
  colour,
  sizes,
  preselectedSize,
}: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function open() {
    setState({
      kind: "form",
      size: preselectedSize ?? sizes[0] ?? "",
      email: "",
      error: null,
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind !== "form") return;
    const formState = state;
    const { size, email } = formState;
    startTransition(async () => {
      const result = await subscribeBackInStockAction(productSlug, colour ?? "", size, email);
      if (result.ok) {
        setState({ kind: "success", alreadySubscribed: result.alreadySubscribed });
      } else {
        setState({ kind: "form", size, email, error: result.error });
      }
    });
  }

  if (state.kind === "success") {
    return (
      <div
        className="w-full py-4 px-4 text-[12px] tracking-[0.18em] uppercase font-medium border text-center"
        style={{ borderColor: "var(--color-emerald)", color: "var(--color-emerald)" }}
        role="status"
      >
        {state.alreadySubscribed
          ? "You'll be the first to know"
          : "Saved. We'll email when it's back."}
      </div>
    );
  }

  if (state.kind === "idle") {
    return (
      <button
        type="button"
        onClick={open}
        className="w-full py-4 text-[12px] tracking-[0.18em] uppercase font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
      >
        Sold out · Notify me when back
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border p-4 space-y-3" style={{ borderColor: "var(--color-rule)" }}>
      <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--color-emerald)" }}>
        Email me when {productName} returns
      </p>
      <label className="block text-xs space-y-1">
        <span style={{ color: "var(--color-muted)" }}>Size</span>
        <select
          value={state.size}
          onChange={e => setState({ ...state, size: e.target.value })}
          className="w-full h-11 border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        >
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="block text-xs space-y-1">
        <span style={{ color: "var(--color-muted)" }}>Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={state.email}
          onChange={e => setState({ ...state, email: e.target.value })}
          placeholder="you@example.com"
          className="w-full h-11 border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 text-[12px] tracking-[0.18em] uppercase font-medium disabled:opacity-50"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
      >
        {pending ? "Saving…" : "Notify me"}
      </button>
      {state.kind === "form" && state.error && (
        <p className="text-xs" style={{ color: "var(--color-oxblood)" }} role="alert">{state.error}</p>
      )}
      <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
        One email when this piece is back in your size. No marketing.
      </p>
    </form>
  );
}
