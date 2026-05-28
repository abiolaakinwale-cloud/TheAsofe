"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail("");
  }

  if (submitted) {
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
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Your email"
        className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:opacity-50"
        style={{ color: "rgba(255,255,255,0.9)" }}
      />
      <button
        type="submit"
        className="ml-4 py-3 text-[11px] tracking-[0.18em] uppercase font-medium transition-opacity hover:opacity-70"
        style={{ color: "var(--color-accent-soft)" }}
      >
        Subscribe →
      </button>
    </form>
  );
}
