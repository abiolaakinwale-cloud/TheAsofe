import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatDate, RETURN_STATUS_LABEL } from "@/lib/account";

const STATUSES = ["requested", "approved", "received", "refunded", "rejected", "cancelled"] as const;
type Status = typeof STATUSES[number];

const colour: Record<Status, string> = {
  requested: "var(--color-saffron)",
  approved:  "var(--color-cobalt)",
  received:  "var(--color-cobalt)",
  refunded:  "var(--color-emerald)",
  rejected:  "var(--color-oxblood)",
  cancelled: "var(--color-muted)",
};

export default async function AdminReturnsList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as Status) ? (status as Status) : null;

  const sb = getAdminSupabase();
  let q = sb
    .from("returns")
    .select("id, rma_number, status, reason, initiated_at, order_id, customer_id")
    .order("initiated_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  const { data: returns } = await q;

  const counts = await Promise.all(
    STATUSES.map(s => sb.from("returns").select("id", { count: "exact", head: true }).eq("status", s))
  );

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Returns</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {returns?.length ?? 0} {filter ? `${filter} ` : ""}{(returns?.length ?? 0) === 1 ? "return" : "returns"}.
      </h1>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/returns" className="lux-link" style={{ color: !filter ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
        {STATUSES.map((s, i) => {
          const n = counts[i].count ?? 0;
          return (
            <Link key={s} href={`/admin/returns?status=${s}`} className="lux-link" style={{ color: filter === s ? colour[s] : "var(--color-muted)" }}>
              {s} ({n})
            </Link>
          );
        })}
      </nav>

      {!returns || returns.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No returns in this view.</p>
      ) : (
        <ul className="space-y-px">
          {returns.map(r => (
            <li key={r.id}>
              <Link
                href={`/admin/returns/${r.id}`}
                className="grid grid-cols-12 gap-4 items-center p-5 hover:bg-[var(--color-cream)] transition-colors"
                style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
              >
                <span className="col-span-3 lg:col-span-2 font-mono text-sm" style={{ color: "var(--color-ink)" }}>{r.rma_number}</span>
                <span className="col-span-5 lg:col-span-3 text-xs" style={{ color: "var(--color-muted)" }}>
                  Order {r.order_id.slice(0, 8)}
                </span>
                <span className="hidden lg:inline lg:col-span-3 text-xs" style={{ color: "var(--color-muted)" }}>
                  {r.reason.replace(/_/g, " ")}
                </span>
                <span className="col-span-4 lg:col-span-2 text-xs" style={{ color: "var(--color-muted)" }}>
                  {formatDate(r.initiated_at)}
                </span>
                <span
                  className="col-span-12 lg:col-span-2 text-right text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: colour[r.status as Status] ?? "var(--color-muted)" }}
                >
                  {RETURN_STATUS_LABEL[r.status as keyof typeof RETURN_STATUS_LABEL] ?? r.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
