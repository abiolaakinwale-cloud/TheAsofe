import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";

const STATUSES = ["awaiting_dispatch", "in_transit", "customs", "arrived", "inducted", "cancelled"] as const;
type Status = typeof STATUSES[number];

const colour: Record<Status, string> = {
  awaiting_dispatch: "var(--color-muted)",
  in_transit:        "var(--color-saffron)",
  customs:           "var(--color-cobalt)",
  arrived:           "var(--color-emerald)",
  inducted:          "var(--color-ink)",
  cancelled:         "var(--color-oxblood)",
};

const labelOf = (s: Status) => s.replace(/_/g, " ");

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as Status) ? (status as Status) : null;

  const sb = getAdminSupabase();
  let q = sb
    .from("shipments")
    .select("id, brand, status, expected_arrival, received_at, created_at")
    .order("created_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  const { data: shipments } = await q;

  const counts = await Promise.all(
    STATUSES.map(s => sb.from("shipments").select("id", { count: "exact", head: true }).eq("status", s))
  );

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
        <div>
          <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Consignments</p>
          <h1 className="display text-4xl lg:text-5xl" style={{ color: "var(--color-ink)" }}>
            {shipments?.length ?? 0} {filter ? `${labelOf(filter)} ` : ""}{(shipments?.length ?? 0) === 1 ? "shipment" : "shipments"}.
          </h1>
        </div>
        <Link href="/admin/shipments/new" className="px-7 py-3.5 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
          Log a consignment
        </Link>
      </div>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/shipments" className="lux-link" style={{ color: !filter ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
        {STATUSES.map((s, i) => (
          <Link key={s} href={`/admin/shipments?status=${s}`} className="lux-link" style={{ color: filter === s ? colour[s] : "var(--color-muted)" }}>
            {labelOf(s)} ({counts[i].count ?? 0})
          </Link>
        ))}
      </nav>

      {(shipments ?? []).length === 0 ? (
        <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>
          No consignments {filter ? `in '${labelOf(filter)}'` : "logged yet"}.
        </p>
      ) : (
        <ul className="space-y-px">
          {shipments!.map(s => (
            <li key={s.id} className="p-6 grid grid-cols-12 items-center gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="col-span-12 lg:col-span-4">
                <Link href={`/admin/shipments/${s.id}`} className="serif text-xl lux-link tabular-nums" style={{ color: "var(--color-ink)" }}>
                  #{s.id.slice(0, 8).toUpperCase()}
                </Link>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{new Date(s.created_at).toLocaleString()}</p>
              </div>
              <p className="col-span-6 lg:col-span-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>{s.brand}</p>
              <p className="col-span-3 lg:col-span-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                {s.expected_arrival ? `ETA ${s.expected_arrival}` : "—"}
              </p>
              <div className="col-span-3 lg:col-span-2 flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase justify-end" style={{ color: colour[s.status as Status] }}>
                <span className="w-1.5 h-1.5" style={{ backgroundColor: colour[s.status as Status] }} />
                {labelOf(s.status as Status)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
