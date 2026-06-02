import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatGbpPence } from "@/lib/gift-cards";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default async function AdminReferralsPage() {
  const sb = getAdminSupabase();
  const { data: rows } = await sb
    .from("referrals")
    .select("id, code, status, reward_amount_pence, referee_email, attributed_order_id, created_at, rewarded_at, referrer_user_id, referrer:referrer_user_id(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  type Row = {
    id: string;
    code: string;
    status: string;
    reward_amount_pence: number;
    referee_email: string | null;
    attributed_order_id: string | null;
    created_at: string;
    rewarded_at: string | null;
    referrer_user_id: string;
    referrer: { email: string } | { email: string }[] | null;
  };
  const list = (rows as unknown as Row[]) ?? [];

  const totalIssuedPence = list.filter(r => r.status === "rewarded").reduce((s, r) => s + r.reward_amount_pence * 2, 0); // both sides paid out
  const rewarded         = list.filter(r => r.status === "rewarded").length;

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Referrals</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        {list.length} {list.length === 1 ? "referral" : "referrals"} on the books.
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        Both referrer and referee receive £25 store credit when a referee places their first paid order. Costs come out of marketing budget — accumulated total below.
      </p>

      <div className="grid sm:grid-cols-2 gap-px mb-12 max-w-3xl">
        <Stat k="Rewarded referrals" v={String(rewarded)}                colour="var(--color-emerald)" />
        <Stat k="Total credit issued" v={formatGbpPence(totalIssuedPence)} colour="var(--color-saffron)" />
      </div>

      {list.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No referrals recorded yet.</p>
      ) : (
        <ul className="space-y-px max-w-6xl">
          <li className="hidden lg:grid grid-cols-12 gap-4 text-[10px] tracking-[0.22em] uppercase pb-2" style={{ color: "var(--color-muted)" }}>
            <span className="col-span-2">Code</span>
            <span className="col-span-3">Referrer</span>
            <span className="col-span-3">Referee</span>
            <span className="col-span-2">Date</span>
            <span className="col-span-1 text-right">Reward</span>
            <span className="col-span-1 text-right">Status</span>
          </li>
          {list.map(r => {
            const referrer = Array.isArray(r.referrer) ? r.referrer[0] : r.referrer;
            return (
              <li key={r.id} className="grid grid-cols-12 gap-4 items-baseline p-4 text-sm" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                <span className="col-span-12 lg:col-span-2 font-mono text-xs" style={{ color: "var(--color-ink)" }}>{r.code}</span>
                <span className="col-span-6 lg:col-span-3 text-xs truncate" style={{ color: "var(--color-muted)" }}>{referrer?.email ?? "—"}</span>
                <span className="col-span-6 lg:col-span-3 text-xs truncate" style={{ color: "var(--color-muted)" }}>{r.referee_email ?? "—"}</span>
                <span className="col-span-4 lg:col-span-2 text-xs" style={{ color: "var(--color-muted)" }}>{formatDate(r.rewarded_at ?? r.created_at)}</span>
                <span className="col-span-4 lg:col-span-1 text-xs text-right tabular-nums" style={{ color: "var(--color-ink)" }}>{formatGbpPence(r.reward_amount_pence)}</span>
                <span className="col-span-4 lg:col-span-1 text-right text-[10px] tracking-[0.18em] uppercase" style={{
                  color: r.status === "rewarded" ? "var(--color-emerald)" : r.status === "cancelled" ? "var(--color-oxblood)" : "var(--color-saffron)",
                }}>
                  {r.status}
                </span>
                {r.attributed_order_id && (
                  <Link href={`/admin/orders/${r.attributed_order_id}`} className="col-span-12 text-[10px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-cobalt)" }}>
                    → Order {r.attributed_order_id.slice(0, 8)}
                  </Link>
                )}
              </li>
            );
          })}
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
