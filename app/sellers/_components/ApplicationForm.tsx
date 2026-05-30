"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { registerAsBrand, type BrandRegistrationInput } from "../actions";

const productCategories = [
  "Womenswear",
  "Menswear",
  "Bags & leather goods",
  "Footwear",
  "Jewellery",
  "Accessories",
];

const inventoryBands = [
  "Under 20 pieces / month",
  "20–50 pieces / month",
  "50–150 pieces / month",
  "150–400 pieces / month",
  "400+ pieces / month",
];

const empty: BrandRegistrationInput & { passwordConfirm: string } = {
  email: "",
  password: "",
  passwordConfirm: "",
  brandName: "",
  founderName: "",
  instagramHandle: "",
  productCategory: "",
  monthlyInventoryEstimate: "",
  whatsappNumber: "",
  website: "",
};

export default function ApplicationForm() {
  const router = useRouter();
  const [values, setValues] = useState(empty);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "ok" } | { kind: "error"; msg: string }>({ kind: "idle" });

  function update<K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) {
    setValues(prev => ({ ...prev, [k]: v }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    if (values.password !== values.passwordConfirm) {
      setStatus({ kind: "error", msg: "Passwords don't match." });
      return;
    }
    const { passwordConfirm: _confirm, ...payload } = values;
    void _confirm;
    startTransition(async () => {
      const result = await registerAsBrand(payload);
      if (result.ok) {
        setStatus({ kind: "ok" });
        setValues(empty);
        // Soft-refresh so any session change is picked up (signUp may issue a
        // session cookie depending on Supabase confirm-email setting).
        router.refresh();
      } else {
        setStatus({ kind: "error", msg: result.error });
      }
    });
  }

  if (status.kind === "ok") {
    return (
      <div className="space-y-6 p-10 lg:p-12" style={{ backgroundColor: "var(--color-cream)" }}>
        <p className="eyebrow" style={{ color: "var(--color-emerald)" }}>Application received</p>
        <h3 className="display text-2xl lg:text-3xl" style={{ color: "var(--color-ink)" }}>
          Thank you — your application is with our curation team.
        </h3>
        <p className="text-base leading-relaxed max-w-lg" style={{ color: "var(--color-ink-soft)" }}>
          Your account has been created. Log in any time to see the status of your application; we&apos;ll write
          when it&apos;s reviewed, typically within five working days.
        </p>
        <div className="flex flex-wrap gap-4 pt-2">
          <Link href="/brand-signin" className="px-8 py-3 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Log in to your account →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:gap-7" noValidate>
      {/* Account */}
      <div>
        <p className="eyebrow mb-5" style={{ color: "var(--color-oxblood)" }}>1 · Create your account</p>
        <div className="grid sm:grid-cols-2 gap-6 lg:gap-7">
          <Field label="Email" required>
            <Input value={values.email} onChange={v => update("email", v)} type="email" autoComplete="email" placeholder="you@yourbrand.com" />
          </Field>
          <Field label="Password" required hint="At least 8 characters">
            <Input value={values.password} onChange={v => update("password", v)} type="password" autoComplete="new-password" />
          </Field>
        </div>
        <div className="mt-6 lg:mt-7">
          <Field label="Confirm password" required>
            <Input value={values.passwordConfirm} onChange={v => update("passwordConfirm", v)} type="password" autoComplete="new-password" />
          </Field>
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--color-muted)" }}>
          Already have an account?{" "}
          <Link href="/brand-signin" className="lux-link" style={{ color: "var(--color-ink)" }}>Log in here →</Link>
        </p>
      </div>

      {/* Brand details */}
      <div className="pt-6 border-t" style={{ borderColor: "var(--color-rule)" }}>
        <p className="eyebrow mb-5" style={{ color: "var(--color-oxblood)" }}>2 · About your brand</p>
        <div className="grid sm:grid-cols-2 gap-6 lg:gap-7">
          <Field label="Brand name" required>
            <Input value={values.brandName} onChange={v => update("brandName", v)} autoComplete="organization" />
          </Field>
          <Field label="Founder name" required>
            <Input value={values.founderName} onChange={v => update("founderName", v)} autoComplete="name" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 lg:gap-7 mt-6 lg:mt-7">
          <Field label="Instagram handle" required hint="e.g. @atelier.adunni">
            <Input value={values.instagramHandle} onChange={v => update("instagramHandle", v)} placeholder="@yourbrand" />
          </Field>
          <Field label="WhatsApp number" required hint="Include your country code">
            <Input value={values.whatsappNumber} onChange={v => update("whatsappNumber", v)} placeholder="+234 803 ..." inputMode="tel" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 lg:gap-7 mt-6 lg:mt-7">
          <Field label="Product category" required>
            <Select value={values.productCategory} onChange={v => update("productCategory", v)} options={productCategories} placeholder="Select a department" />
          </Field>
          <Field label="Monthly inventory estimate" required>
            <Select value={values.monthlyInventoryEstimate} onChange={v => update("monthlyInventoryEstimate", v)} options={inventoryBands} placeholder="Approximate volume" />
          </Field>
        </div>

        <div className="mt-6 lg:mt-7">
          <Field label="Website" hint="Optional">
            <Input value={values.website || ""} onChange={v => update("website", v)} placeholder="https://" inputMode="url" />
          </Field>
        </div>
      </div>

      <div className="pt-6 flex items-center gap-6 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
        >
          {pending ? "Submitting…" : "Create account & apply"}
        </button>
        <p className="text-xs leading-relaxed max-w-sm" style={{ color: "var(--color-muted)" }}>
          We review every application personally. Expect a reply within five working days.
        </p>
      </div>

      <AnimatePresence>
        {status.kind === "error" && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm pt-2"
            style={{ color: "var(--color-oxblood)" }}
          >
            {status.msg}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-2 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
        <span>{label}{required && <span style={{ color: "var(--color-oxblood)" }}> *</span>}</span>
        {hint && <span className="text-[10px] tracking-[0.12em] normal-case font-normal" style={{ color: "var(--color-muted)" }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Input(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
}) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      onChange={e => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      autoComplete={props.autoComplete}
      inputMode={props.inputMode}
      className="w-full bg-transparent border-b py-3 text-base outline-none transition-colors focus:border-[var(--color-ink)]"
      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
    />
  );
}

function Select(props: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <div className="relative">
      <select
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        className="w-full appearance-none bg-transparent border-b py-3 pr-8 text-base outline-none transition-colors focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: props.value ? "var(--color-ink)" : "var(--color-muted)" }}
      >
        <option value="" disabled>{props.placeholder ?? "Select..."}</option>
        {props.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg
        viewBox="0 0 12 8"
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 w-3 h-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        style={{ color: "var(--color-muted)" }}
      >
        <path d="M1 1l5 5 5-5" />
      </svg>
    </div>
  );
}
