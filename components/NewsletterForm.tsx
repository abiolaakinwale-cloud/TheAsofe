"use client";

import { useState, useTransition } from "react";
import { subscribeToNewsletter } from "./newsletter-action";

export default function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError(null);
    startTransition(async () => {
      const r = await subscribeToNewsletter(email, source);
      if (r.ok) {
        setStatus("ok");
        setEmail("");
      } else {
        setError(r.error);
        setStatus("error");
      }
    });
  }

  if (status === "ok") {
    return (
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
        Thank you. The first letter will arrive in time.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end border-b" style={{ borderColor: "rgba(255,255,255,0.25)" }}>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Your email"
        className="flex-1 bg-transparent py-3 text-base outline-none placeholder:opacity-50 min-w-0"
        style={{ color: "rgba(255,255,255,0.9)" }}
      />
      <button
        type="submit"
        disabled={pending}
        className="ml-4 py-3 text-[11px] tracking-[0.18em] uppercase font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
        style={{ color: "var(--color-accent-soft)" }}
      >
        {pending ? "…" : "Subscribe →"}
      </button>
      {status === "error" && error && (
        <p className="ml-4 text-xs whitespace-nowrap" style={{ color: "var(--color-accent-soft)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
