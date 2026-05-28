"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updatePassword } from "@/app/signin/actions";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    startTransition(async () => {
      const r = await updatePassword(password);
      if (r.ok) {
        router.push("/account");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="block mb-2 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
          New password
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-transparent border-b py-3 text-base outline-none focus:border-[var(--color-ink)]"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
        <span className="block mt-1.5 text-[11px]" style={{ color: "var(--color-muted)" }}>At least 8 characters.</span>
      </label>

      <label className="block">
        <span className="block mb-2 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
          Confirm new password
        </span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="w-full bg-transparent border-b py-3 text-base outline-none focus:border-[var(--color-ink)]"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
      >
        {pending ? "Saving…" : "Save new password"}
      </button>

      {error && <p className="text-sm" style={{ color: "var(--color-oxblood)" }}>{error}</p>}
    </form>
  );
}
