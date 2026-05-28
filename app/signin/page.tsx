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
    <section className="min-h-[80vh] grid lg:grid-cols-2" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="flex items-center justify-center px-6 lg:px-12 py-20">
        <div className="w-full max-w-md">
          {/* Audience switcher */}
          <div className="grid grid-cols-2 mb-10 border" style={{ borderColor: "var(--color-rule)" }}>
            <span
              aria-current="page"
              className="text-center py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
            >
              Customer
            </span>
            <Link
              href="/admin-signin"
              className="text-center py-3 text-[11px] tracking-[0.22em] uppercase font-medium transition-colors hover:bg-[var(--color-cream)]"
              style={{ color: "var(--color-ink)" }}
            >
              Staff
            </Link>
          </div>

          <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>The House Door</p>
          <h1 className="display text-4xl lg:text-5xl mb-4" style={{ color: "var(--color-ink)" }}>
            Log in to Asofe.
          </h1>
          <p className="text-base leading-relaxed mb-10 max-w-sm" style={{ color: "var(--color-ink-soft)" }}>
            Track your orders, save addresses, and keep a record of every piece you&apos;ve collected.
            Log in with your email and password.
          </p>

          {error && (
            <p className="mb-6 text-sm" style={{ color: "var(--color-oxblood)" }}>
              {decodeURIComponent(error)}
            </p>
          )}

          <SignInForm next={next ?? null} />

          <div className="mt-12 pt-8 border-t text-[11px] tracking-[0.18em] uppercase" style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)" }}>
            <p>
              Run a brand?{" "}
              <Link href="/sellers" className="lux-link" style={{ color: "var(--color-ink)" }}>
                Apply to sell on Asofe →
              </Link>
            </p>
            <p className="mt-3">
              Asofe staff?{" "}
              <Link href="/admin-signin" className="lux-link" style={{ color: "var(--color-ink)" }}>
                Staff log-in →
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div
        className="hidden lg:block relative"
        style={{
          backgroundImage: "url(/asofe/hero-secondary.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />
    </section>
  );
}
