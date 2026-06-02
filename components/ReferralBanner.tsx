import { cookies } from "next/headers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { REFERRAL_REWARD_PENCE } from "@/lib/referrals";
import { formatGbpPence } from "@/lib/gift-cards";

async function dismiss() {
  "use server";
  const c = await cookies();
  c.set("ref_dismissed", "1", { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

/**
 * Server component — appears at the top of any storefront page when the
 * visitor landed via /?ref=CODE and hasn't dismissed it. Looks up the
 * referrer's first name (or "a friend" fallback) and shows the reward.
 */
export default async function ReferralBanner() {
  const c = await cookies();
  const code = c.get("ref")?.value?.toUpperCase();
  const dismissed = c.get("ref_dismissed")?.value === "1";
  if (!code || dismissed) return null;

  const admin = getAdminSupabase();
  const { data: referrer } = await admin
    .from("profiles")
    .select("email")
    .eq("referral_code", code)
    .maybeSingle();
  if (!referrer) return null;

  // First word of the email local part, capitalised — "abiola.akinwale" → "Abiola"
  const first = (referrer.email?.split("@")[0] ?? "a friend")
    .split(/[._-]/)[0]
    .replace(/^./, (ch: string) => ch.toUpperCase()) || "a friend";

  return (
    <div className="border-b" style={{ backgroundColor: "var(--color-saffron-soft)", color: "var(--color-ink)", borderColor: "var(--color-rule)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-3 flex items-center justify-between gap-6 text-[11px] tracking-[0.18em] uppercase font-medium">
        <p className="flex items-center gap-3">
          <span aria-hidden style={{ color: "var(--color-oxblood)" }}>✦</span>
          <span>
            <span style={{ color: "var(--color-oxblood)" }}>{first} sent you to Asofe</span>
            <span className="ml-3 hidden sm:inline" style={{ color: "var(--color-ink-soft)" }}>
              · {formatGbpPence(REFERRAL_REWARD_PENCE)} credit on your first order
            </span>
          </span>
        </p>
        <form action={dismiss}>
          <button type="submit" aria-label="Dismiss" className="text-base leading-none px-2 -mr-2" style={{ color: "var(--color-ink)" }}>
            ×
          </button>
        </form>
      </div>
    </div>
  );
}
