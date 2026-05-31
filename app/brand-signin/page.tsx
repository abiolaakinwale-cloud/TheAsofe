import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import SignInForm from "@/app/signin/SignInForm";

export const metadata: Metadata = {
  title: "Brand log-in",
  description: "Log in to your Asofe brand account — manage your collection, orders, and shipments.",
  robots: { index: false, follow: false },
};

export default async function BrandSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Already signed in? Send a seller (or admin) to the dashboard; bounce a
  // signed-in customer back to /account so they're not confused.
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "seller" || profile?.role === "admin") {
      redirect(next || "/dashboard");
    }
    redirect("/account");
  }

  return (
    <section
      className="min-h-screen grid place-items-center px-6 py-20"
      style={{ backgroundColor: "var(--color-cream)", color: "var(--color-ink)" }}
    >
      <div className="w-full max-w-sm">
        {/* Audience switcher — three-way */}
        <div className="grid grid-cols-3 mb-10 border" style={{ borderColor: "var(--color-rule)" }}>
          <Link
            href="/signin"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium transition-colors hover:bg-[var(--color-ground)]"
            style={{ color: "var(--color-ink)" }}
          >
            Customer
          </Link>
          <span
            aria-current="page"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Brand
          </span>
          <Link
            href="/admin-signin"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium transition-colors hover:bg-[var(--color-ground)]"
            style={{ color: "var(--color-ink)" }}
          >
            Staff
          </Link>
        </div>

        <p className="text-[10px] tracking-[0.22em] uppercase font-medium mb-8" style={{ color: "var(--color-emerald)" }}>
          Asofe · Brand
        </p>
        <h1 className="display text-3xl lg:text-4xl mb-3" style={{ color: "var(--color-ink)" }}>
          Brand log-in.
        </h1>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "var(--color-ink-soft)" }}>
          Access your atelier — manage your collection, stock, orders, and shipments.
        </p>

        {error && (
          <p className="mb-6 text-sm" style={{ color: "var(--color-oxblood)" }}>
            {decodeURIComponent(error)}
          </p>
        )}

        <SignInForm next={next || "/dashboard"} />

        <p className="mt-10 text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--color-muted)" }}>
          Not on Asofe yet?{" "}
          <Link href="/sellers" className="lux-link" style={{ color: "var(--color-ink)" }}>
            Apply to sell →
          </Link>
        </p>
        <p className="mt-3 text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--color-muted)" }}>
          Awaiting approval? We&apos;ll write when your application is reviewed.
        </p>
      </div>
    </section>
  );
}
