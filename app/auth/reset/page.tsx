import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  // The recovery email lands on /auth/callback → exchanges code → redirects here
  // with a temporary session. If there's no session, the link is invalid/expired.
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?error=" + encodeURIComponent("Reset link is invalid or expired. Request a new one."));
  return (
    <section className="min-h-[80vh] grid place-items-center px-6 py-20" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="w-full max-w-md">
        <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>Password reset</p>
        <h1 className="display text-4xl lg:text-5xl mb-4" style={{ color: "var(--color-ink)" }}>
          Set a new password.
        </h1>
        <p className="text-base leading-relaxed mb-10 max-w-sm" style={{ color: "var(--color-ink-soft)" }}>
          Enter a new password below. We&apos;ll log you in straight away.
        </p>
        <ResetPasswordForm />
      </div>
    </section>
  );
}
