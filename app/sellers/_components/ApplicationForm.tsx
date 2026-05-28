"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitApplication, type ApplicationInput } from "../actions";

const productCategories = [
  "Womenswear",
  "Menswear",
  "Bags & leather goods",
  "Footwear",
  "Jewellery",
  "Accessories",
  "Children",
];

const inventoryBands = [
  "Under 20 pieces / month",
  "20–50 pieces / month",
  "50–150 pieces / month",
  "150–400 pieces / month",
  "400+ pieces / month",
];

const empty: ApplicationInput = {
  brandName: "",
  founderName: "",
  instagramHandle: "",
  productCategory: "",
  monthlyInventoryEstimate: "",
  whatsappNumber: "",
  website: "",
};

export default function ApplicationForm() {
  const [values, setValues] = useState<ApplicationInput>(empty);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "ok" } | { kind: "error"; msg: string }>({ kind: "idle" });

  function update<K extends keyof ApplicationInput>(k: K, v: ApplicationInput[K]) {
    setValues(prev => ({ ...prev, [k]: v }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await submitApplication(values);
      if (result.ok) {
        setStatus({ kind: "ok" });
        setValues(empty);
      } else {
        setStatus({ kind: "error", msg: result.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:gap-7" noValidate>
      <div className="grid sm:grid-cols-2 gap-6 lg:gap-7">
        <Field label="Brand name" required>
          <Input value={values.brandName} onChange={v => update("brandName", v)} autoComplete="organization" />
        </Field>
        <Field label="Founder name" required>
          <Input value={values.founderName} onChange={v => update("founderName", v)} autoComplete="name" />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 lg:gap-7">
        <Field label="Instagram handle" required hint="e.g. @atelier.adunni">
          <Input value={values.instagramHandle} onChange={v => update("instagramHandle", v)} placeholder="@yourbrand" />
        </Field>
        <Field label="WhatsApp number" required hint="Include your country code">
          <Input value={values.whatsappNumber} onChange={v => update("whatsappNumber", v)} placeholder="+234 803 ..." inputMode="tel" />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 lg:gap-7">
        <Field label="Product category" required>
          <Select value={values.productCategory} onChange={v => update("productCategory", v)} options={productCategories} placeholder="Select a department" />
        </Field>
        <Field label="Monthly inventory estimate" required>
          <Select value={values.monthlyInventoryEstimate} onChange={v => update("monthlyInventoryEstimate", v)} options={inventoryBands} placeholder="Approximate volume" />
        </Field>
      </div>

      <Field label="Website" hint="Optional">
        <Input value={values.website || ""} onChange={v => update("website", v)} placeholder="https://" inputMode="url" />
      </Field>

      <div className="pt-4 flex items-center gap-6 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
        >
          {pending ? "Submitting…" : "Apply to Join Asofe"}
        </button>
        <p className="text-xs leading-relaxed max-w-sm" style={{ color: "var(--color-muted)" }}>
          We review every application personally. Expect a reply on WhatsApp within five working days.
        </p>
      </div>

      <AnimatePresence>
        {status.kind === "ok" && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm pt-2"
            style={{ color: "var(--color-emerald)" }}
          >
            Thank you — your application is with our curation team. We'll be in touch.
          </motion.p>
        )}
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

function Input(props: { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <input
      type="text"
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
