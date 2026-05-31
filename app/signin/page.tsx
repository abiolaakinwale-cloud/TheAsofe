import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import SignInForm from "./SignInForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Asofe account.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Already signed in? Send them where they came for, defaulting to /account.
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (user) redirect(next || "/account");

  return (
    <section
      className="min-h-screen grid place-items-center px-6 py-20"
      style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
    >
      <div className="w-full max-w-sm">
        {/* Audience switcher — three-way */}
        <div className="grid grid-cols-3 mb-10 border" style={{ borderColor: "var(--color-rule)" }}>
          <span
            aria-current="page"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Customer
          </span>
          <Link
            href="/brand-signin"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium transition-colors hover:bg-[var(--color-cream)]"
            style={{ color: "var(--color-ink)" }}
          >
            Brand
          </Link>
          <Link
            href="/admin-signin"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium transition-colors hover:bg-[var(--color-cream)]"
            style={{ color: "var(--color-ink)" }}
          >
            Staff
          </Link>
        </div>

        <p className="text-[10px] tracking-[0.22em] uppercase font-medium mb-8" style={{ color: "var(--color-oxblood)" }}>
          Asofe · Customer
        </p>
        <h1 className="display text-3xl lg:text-4xl mb-3" style={{ color: "var(--color-ink)" }}>
          Log in to Asofe.
        </h1>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "var(--color-ink-soft)" }}>
          Track your orders, save addresses, and keep a record of every piece you&apos;ve collected.
          Log in with your email and password, or create an account to begin.
        </p>

        {error && (
          <p className="mb-6 text-sm" style={{ color: "var(--color-oxblood)" }}>
            {decodeURIComponent(error)}
          </p>
        )}

        <SignInForm next={next ?? null} demoRole="customer" />

        <p className="mt-10 text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--color-muted)" }}>
          Run a brand?{" "}
          <Link href="/sellers" className="lux-link" style={{ color: "var(--color-ink)" }}>
            Apply to sell on Asofe →
          </Link>
        </p>
      </div>
    </section>
  );
}
