import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import SignInForm from "@/app/signin/SignInForm";

export const metadata: Metadata = {
  title: "Staff log-in",
  description: "Log in to manage Asofe.",
  robots: { index: false, follow: false },
};

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // If already signed in as admin, jump straight to /admin.
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (user) {
    const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin") redirect(next || "/admin");
  }

  return (
    <section
      className="min-h-screen grid place-items-center px-6 py-20"
      style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
    >
      <div className="w-full max-w-sm">
        {/* Audience switcher — three-way */}
        <div className="grid grid-cols-3 mb-10 border" style={{ borderColor: "rgba(255,255,255,0.25)" }}>
          <Link
            href="/signin"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium transition-colors hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Customer
          </Link>
          <Link
            href="/brand-signin"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium transition-colors hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Brand
          </Link>
          <span
            aria-current="page"
            className="text-center min-h-[44px] flex items-center justify-center text-[11px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ground)", color: "var(--color-ink)" }}
          >
            Staff
          </span>
        </div>

        <p className="text-[10px] tracking-[0.22em] uppercase font-medium mb-8" style={{ color: "var(--color-saffron-soft)" }}>
          Asofe · Staff
        </p>
        <h1 className="display text-3xl lg:text-4xl mb-3" style={{ color: "var(--color-ground)" }}>
          Operations log-in.
        </h1>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.7)" }}>
          Admin access only. Enter the staff email and password associated with your account.
        </p>

        {error && (
          <p className="mb-6 text-sm" style={{ color: "var(--color-saffron-soft)" }}>
            {decodeURIComponent(error)}
          </p>
        )}

        <SignInForm next={next || "/admin"} variant="dark" />

        <p className="mt-10 text-[10px] tracking-[0.22em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
          Customer account? <a href="/signin" className="underline">Log in over here →</a>
        </p>
      </div>
    </section>
  );
}
