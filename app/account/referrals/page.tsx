import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { getOrCreateReferralCode, REFERRAL_REWARD_PENCE } from "@/lib/referrals";
import { formatGbpPence } from "@/lib/gift-cards";

export const metadata = { title: "Referrals" };

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default async function AccountReferralsPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account/referrals");

  // Lazy-create the code on first visit
  const code = await getOrCreateReferralCode(user.id, user.email?.split("@")[0] ?? null);
  const shareUrl = `${SITE_URL}/?ref=${code}`;

  // Personal stats (RLS scopes to caller via referrer_user_id policy)
  const admin = getAdminSupabase();
  const { data: rows } = await admin
    .from("referrals")
    .select("id, status, referee_email, attributed_order_id, reward_amount_pence, created_at, rewarded_at")
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false });
  const referrals = rows ?? [];
  const totalEarnedPence = referrals
    .filter(r => r.status === "rewarded")
    .reduce((s, r) => s + r.reward_amount_pence, 0);

  return (
    <>
      <Link href="/account" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Overview
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Referrals</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        Share Asofe.
      </h1>
      <p className="text-base leading-relaxed mb-12 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
        Share your link with someone who&apos;d appreciate it. When they place their first order, you both receive{" "}
        <strong style={{ color: "var(--color-ink)" }}>{formatGbpPence(REFERRAL_REWARD_PENCE)} of store credit</strong>{" "}
        — issued as a gift card, redeemable at checkout.
      </p>

      <div className="grid sm:grid-cols-3 gap-px mb-12 max-w-3xl">
        <Stat k="Total earned"     v={formatGbpPence(totalEarnedPence)} colour="var(--color-emerald)" />
        <Stat k="Friends signed up" v={String(referrals.filter(r => r.status === "rewarded").length)} colour="var(--color-cobalt)" />
        <Stat k="In progress"       v={String(referrals.filter(r => r.status === "pending").length)} colour="var(--color-saffron)" />
      </div>

      <section className="mb-16 p-6 max-w-3xl" style={{ backgroundColor: "var(--color-cream)" }}>
        <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>Your link</p>
        <div className="flex items-center gap-2 mb-4">
          <input
            readOnly
            value={shareUrl}
            className="flex-1 h-11 border bg-transparent px-3 text-sm font-mono"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
          Your code is{" "}
          <span className="font-mono" style={{ color: "var(--color-ink)" }}>{code}</span>{" "}
          — share the link via WhatsApp, email, anywhere. Credit is issued automatically when they buy.
        </p>
      </section>

      <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Your referrals</h2>
      {referrals.length === 0 ? (
        <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
          No referrals yet. Share your link with someone who&apos;d love Asofe and they&apos;ll appear here once they order.
        </p>
      ) : (
        <ul className="space-y-px max-w-4xl">
          {referrals.map(r => (
            <li key={r.id} className="grid grid-cols-12 gap-4 items-baseline p-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <span className="col-span-6 lg:col-span-5 text-sm" style={{ color: "var(--color-ink)" }}>
                {r.referee_email ?? "Anonymous"}
              </span>
              <span className="col-span-3 lg:col-span-3 text-xs" style={{ color: "var(--color-muted)" }}>
                {formatDate(r.rewarded_at ?? r.created_at)}
              </span>
              <span className="col-span-3 lg:col-span-2 text-sm text-right tabular-nums" style={{ color: r.status === "rewarded" ? "var(--color-emerald)" : "var(--color-muted)" }}>
                {r.status === "rewarded" ? formatGbpPence(r.reward_amount_pence) : "—"}
              </span>
              <span className="col-span-12 lg:col-span-2 text-right text-[10px] tracking-[0.18em] uppercase" style={{ color: r.status === "rewarded" ? "var(--color-emerald)" : r.status === "cancelled" ? "var(--color-oxblood)" : "var(--color-saffron)" }}>
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ k, v, colour }: { k: string; v: string; colour: string }) {
  return (
    <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[10px] tracking-[0.18em] uppercase mb-3" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-3xl tabular-nums" style={{ color: colour }}>{v}</p>
    </div>
  );
}
