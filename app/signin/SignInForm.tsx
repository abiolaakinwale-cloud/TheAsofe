"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logIn, signUp, sendPasswordReset } from "./actions";
import { generateDemoCredentials, type DemoRole } from "./demo-actions";

type Variant = "light" | "dark";
type Mode = "login" | "signup" | "reset";

export default function SignInForm({
  next,
  variant = "light",
  demoRole,
}: {
  next: string | null;
  variant?: Variant;
  demoRole?: DemoRole;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [demoPending, startDemoTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "info"; msg: string } | { kind: "error"; msg: string }>({ kind: "idle" });

  const c = variant === "dark"
    ? {
        label: "var(--color-saffron-soft)",
        text: "var(--color-ground)",
        border: "rgba(255,255,255,0.25)",
        focusBorder: "var(--color-ground)",
        buttonBg: "var(--color-ground)",
        buttonText: "var(--color-ink)",
        info: "var(--color-saffron-soft)",
        error: "var(--color-saffron-soft)",
        link: "var(--color-saffron-soft)",
        mutedLink: "rgba(255,255,255,0.6)",
      }
    : {
        label: "var(--color-ink)",
        text: "var(--color-ink)",
        border: "var(--color-rule)",
        focusBorder: "var(--color-ink)",
        buttonBg: "var(--color-ink)",
        buttonText: "var(--color-ground)",
        info: "var(--color-emerald)",
        error: "var(--color-oxblood)",
        link: "var(--color-ink)",
        mutedLink: "var(--color-muted)",
      };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      if (mode === "reset") {
        const r = await sendPasswordReset(email);
        if (r.ok) setStatus({ kind: "info", msg: `If an account exists for ${email}, a password-reset link is on its way.` });
        else setStatus({ kind: "error", msg: r.error });
        return;
      }
      const r = mode === "login" ? await logIn(email, password) : await signUp(email, password);
      if (r.ok) {
        router.push(next || "/account");
        router.refresh();
        return;
      }
      setStatus({ kind: "error", msg: r.error });
    });
  }

  const submitLabel = pending
    ? (mode === "reset" ? "Sending…" : mode === "signup" ? "Creating account…" : "Logging in…")
    : mode === "reset" ? "Send reset link"
    : mode === "signup" ? "Create account"
    : "Log in";

  function requestDemoLogin() {
    if (!demoRole) return;
    setStatus({ kind: "idle" });
    startDemoTransition(async () => {
      const r = await generateDemoCredentials(demoRole);
      if (!r.ok) {
        setStatus({ kind: "error", msg: r.error });
        return;
      }
      setMode("login");
      setEmail(r.email);
      setPassword(r.password);
      setStatus({
        kind: "info",
        msg: `Temporary credentials filled in. Click "Log in" to continue.`,
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* Mode pills */}
      {mode !== "reset" && (
        <div className="flex gap-6 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: c.mutedLink }}>
          <button
            type="button"
            onClick={() => { setMode("login"); setStatus({ kind: "idle" }); }}
            className="pb-1"
            style={{
              color: mode === "login" ? c.text : c.mutedLink,
              borderBottom: mode === "login" ? `1px solid ${c.text}` : "none",
            }}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setStatus({ kind: "idle" }); }}
            className="pb-1"
            style={{
              color: mode === "signup" ? c.text : c.mutedLink,
              borderBottom: mode === "signup" ? `1px solid ${c.text}` : "none",
            }}
          >
            Create account
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={setEmail}
          required
          c={c}
        />

        {mode !== "reset" && (
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={setPassword}
            required
            minLength={8}
            c={c}
            hint={mode === "signup" ? "At least 8 characters." : undefined}
          />
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: c.buttonBg, color: c.buttonText }}
        >
          {submitLabel}
        </button>

        {status.kind === "error" && (
          <p className="text-sm" style={{ color: c.error }}>{status.msg}</p>
        )}
        {status.kind === "info" && (
          <p className="text-sm" style={{ color: c.info }}>{status.msg}</p>
        )}
      </form>

      <div className="flex justify-between text-[11px] tracking-[0.18em] uppercase pt-2">
        {mode === "login" && (
          <button type="button" onClick={() => { setMode("reset"); setStatus({ kind: "idle" }); }} className="lux-link" style={{ color: c.mutedLink }}>
            Forgot password?
          </button>
        )}
        {mode === "reset" && (
          <button type="button" onClick={() => { setMode("login"); setStatus({ kind: "idle" }); }} className="lux-link" style={{ color: c.mutedLink }}>
            ← Back to log in
          </button>
        )}
      </div>

      {demoRole && (
        <div className="pt-6 border-t" style={{ borderColor: c.border }}>
          <p className="text-[10px] tracking-[0.22em] uppercase mb-3" style={{ color: c.mutedLink }}>
            Just looking?
          </p>
          <button
            type="button"
            onClick={requestDemoLogin}
            disabled={demoPending}
            className="w-full px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border disabled:opacity-50"
            style={{ borderColor: c.text, color: c.text, backgroundColor: "transparent" }}
          >
            {demoPending ? "Generating…" : `Generate ${demoRole} demo login`}
          </button>
          <p className="mt-3 text-[10px] tracking-[0.12em] leading-relaxed" style={{ color: c.mutedLink }}>
            Creates short-lived credentials. Any previous demo session is invalidated.
          </p>
        </div>
      )}
    </div>
  );
}

type C = {
  label: string; text: string; border: string; focusBorder: string;
  buttonBg: string; buttonText: string; info: string; error: string;
  link: string; mutedLink: string;
};

function Field({
  label, name, type, value, onChange, required, autoComplete, autoFocus, minLength, hint, c,
}: {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  minLength?: number;
  hint?: string;
  c: C;
}) {
  return (
    <label className="block">
      <span className="block mb-2 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: c.label }}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        minLength={minLength}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent border-b py-3 text-base outline-none transition-colors"
        style={{ borderColor: c.border, color: c.text }}
        onFocus={e => (e.currentTarget.style.borderColor = c.focusBorder)}
        onBlur={e => (e.currentTarget.style.borderColor = c.border)}
      />
      {hint && (
        <span className="block mt-1.5 text-[11px]" style={{ color: c.mutedLink }}>{hint}</span>
      )}
    </label>
  );
}
