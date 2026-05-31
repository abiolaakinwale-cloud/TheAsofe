import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatDate, formatPrice } from "@/lib/account";

const STATUSES = ["draft", "sent", "paid", "cancelled"] as const;
type Status = typeof STATUSES[number];

const colour: Record<Status, string> = {
  draft:     "var(--color-muted)",
  sent:      "var(--color-saffron)",
  paid:      "var(--color-emerald)",
  cancelled: "var(--color-oxblood)",
};

export default async function AdminPayoutsList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; brand?: string }>;
}) {
  const { status, brand } = await searchParams;
  const filter = STATUSES.includes(status as Status) ? (status as Status) : null;

  const sb = getAdminSupabase();
  let q = sb
    .from("payouts")
    .select("id, brand, status, period_start, period_end, gross_total, net_amount, currency, created_at")
    .order("created_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  if (brand)  q = q.eq("brand", brand);

  const [{ data: payouts }, counts] = await Promise.all([
    q,
    Promise.all(STATUSES.map(s => sb.from("payouts").select("id", { count: "exact", head: true }).eq("status", s))),
  ]);

  return (
    <>
      <div className="flex items-baseline justify-between mb-12 flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Payouts</p>
          <h1 className="display text-4xl lg:text-5xl" style={{ color: "var(--color-ink)" }}>
            {payouts?.length ?? 0} {filter ? `${filter} ` : ""}{(payouts?.length ?? 0) === 1 ? "payout" : "payouts"}.
          </h1>
        </div>
        <Link
          href="/admin/payouts/new"
          className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
        >
          Generate payout
        </Link>
      </div>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/payouts" className="lux-link" style={{ color: !filter && !brand ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
        {STATUSES.map((s, i) => {
          const n = counts[i].count ?? 0;
          return (
            <Link key={s} href={`/admin/payouts?status=${s}`} className="lux-link" style={{ color: filter === s ? colour[s] : "var(--color-muted)" }}>
              {s} ({n})
            </Link>
          );
        })}
        {brand && (
          <span className="ml-auto" style={{ color: "var(--color-cobalt)" }}>
            brand: {brand} ·{" "}
            <Link href="/admin/payouts" className="lux-link">clear</Link>
          </span>
        )}
      </nav>

      {!payouts || payouts.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No payouts in this view.</p>
      ) : (
        <ul className="space-y-px">
          {payouts.map(p => (
            <li key={p.id}>
              <Link
                href={`/admin/payouts/${p.id}`}
                className="grid grid-cols-12 gap-4 items-baseline p-5 hover:bg-[var(--color-cream)] transition-colors"
                style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
              >
                <span className="col-span-4 lg:col-span-3 text-sm capitalize" style={{ color: "var(--color-ink)" }}>{p.brand.replace(/-/g, " ")}</span>
                <span className="col-span-4 lg:col-span-3 text-xs" style={{ color: "var(--color-muted)" }}>
                  {p.period_start} → {p.period_end}
                </span>
                <span className="hidden lg:inline lg:col-span-2 text-xs" style={{ color: "var(--color-muted)" }}>
                  {formatDate(p.created_at)}
                </span>
                <span className="col-span-2 lg:col-span-2 text-sm text-right tabular-nums" style={{ color: "var(--color-ink)" }}>
                  {formatPrice(p.net_amount, p.currency)}
                </span>
                <span
                  className="col-span-2 lg:col-span-2 text-right text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: colour[p.status as Status] ?? "var(--color-muted)" }}
                >
                  {p.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
