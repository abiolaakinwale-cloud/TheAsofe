import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/data";

const STATUSES = ["pending", "paid", "packed", "dispatched", "delivered", "cancelled", "refunded"] as const;
type Status = typeof STATUSES[number];

const colour: Record<Status, string> = {
  pending:    "var(--color-muted)",
  paid:       "var(--color-saffron)",
  packed:     "var(--color-cobalt)",
  dispatched: "var(--color-cobalt)",
  delivered:  "var(--color-emerald)",
  cancelled:  "var(--color-muted)",
  refunded:   "var(--color-oxblood)",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as Status) ? (status as Status) : null;

  const sb = getAdminSupabase();
  let q = sb.from("orders").select("id, status, customer_email, subtotal, shipping, total, currency, created_at").order("created_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  const { data: orders } = await q;

  const allCountsByStatus = await Promise.all(
    STATUSES.map(s => sb.from("orders").select("id", { count: "exact", head: true }).eq("status", s))
  );

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Orders</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {orders?.length ?? 0} {filter ? `${filter} ` : ""}{(orders?.length ?? 0) === 1 ? "order" : "orders"}.
      </h1>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/orders" className="lux-link" style={{ color: !filter ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
        {STATUSES.map((s, i) => {
          const count = allCountsByStatus[i].count ?? 0;
          return (
            <Link key={s} href={`/admin/orders?status=${s}`} className="lux-link" style={{ color: filter === s ? colour[s] : "var(--color-muted)" }}>
              {s} ({count})
            </Link>
          );
        })}
      </nav>

      {(orders ?? []).length === 0 ? (
        <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>No orders {filter ? `in '${filter}'` : "yet"}.</p>
      ) : (
        <ul className="space-y-px">
          {orders!.map(o => (
            <li key={o.id} className="p-6 grid grid-cols-12 items-center gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="col-span-12 lg:col-span-4">
                <Link href={`/admin/orders/${o.id}`} className="serif text-xl lux-link" style={{ color: "var(--color-ink)" }}>
                  #{o.id.slice(0, 8).toUpperCase()}
                </Link>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <p className="col-span-6 lg:col-span-4 text-sm truncate" style={{ color: "var(--color-ink-soft)" }}>{o.customer_email}</p>
              <p className="col-span-3 lg:col-span-2 text-sm tabular-nums" style={{ color: "var(--color-ink-soft)" }}>{formatPrice(o.total)}</p>
              <div className="col-span-3 lg:col-span-2 flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase justify-end" style={{ color: colour[o.status as Status] }}>
                <span className="w-1.5 h-1.5" style={{ backgroundColor: colour[o.status as Status] }} />
                {o.status}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
