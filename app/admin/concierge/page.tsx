import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default async function AdminConciergeList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status === "closed" ? "closed" : status === "all" ? null : "open";

  const sb = getAdminSupabase();
  let q = sb
    .from("concierge_threads")
    .select("id, customer_id, status, last_message_at, created_at, profiles:customer_id(email)")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (filter) q = q.eq("status", filter);
  const { data: rows } = await q;

  // Latest message preview per thread
  const ids = (rows ?? []).map(r => r.id);
  const previews = new Map<string, { body: string; sender_role: string }>();
  if (ids.length > 0) {
    const { data: msgs } = await sb
      .from("concierge_messages")
      .select("thread_id, body, sender_role, created_at")
      .in("thread_id", ids)
      .order("created_at", { ascending: false });
    for (const m of msgs ?? []) {
      if (!previews.has(m.thread_id)) previews.set(m.thread_id, { body: m.body, sender_role: m.sender_role });
    }
  }

  const [openCount, closedCount] = await Promise.all([
    sb.from("concierge_threads").select("id", { count: "exact", head: true }).eq("status", "open"),
    sb.from("concierge_threads").select("id", { count: "exact", head: true }).eq("status", "closed"),
  ]);

  type Row = { id: string; status: string; last_message_at: string | null; profiles: { email: string } | { email: string }[] | null };
  const list = (rows as unknown as Row[]) ?? [];

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Concierge</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {list.length} {filter ? `${filter} ` : ""}{list.length === 1 ? "thread" : "threads"}.
      </h1>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/concierge" className="lux-link" style={{ color: filter === "open" ? "var(--color-saffron)" : "var(--color-muted)" }}>Open ({openCount.count ?? 0})</Link>
        <Link href="/admin/concierge?status=closed" className="lux-link" style={{ color: filter === "closed" ? "var(--color-muted)" : "var(--color-muted)" }}>Closed ({closedCount.count ?? 0})</Link>
        <Link href="/admin/concierge?status=all" className="lux-link" style={{ color: !filter ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
      </nav>

      {list.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No threads in this view.</p>
      ) : (
        <ul className="space-y-px max-w-4xl">
          {list.map(t => {
            const customer = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
            const p = previews.get(t.id);
            return (
              <li key={t.id}>
                <Link
                  href={`/admin/concierge/${t.id}`}
                  className="grid grid-cols-12 gap-4 items-baseline p-4 hover:bg-[var(--color-cream)] transition-colors"
                  style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
                >
                  <span className="col-span-12 lg:col-span-3 text-sm" style={{ color: "var(--color-ink)" }}>
                    {customer?.email ?? "Unknown"}
                  </span>
                  <span className="col-span-12 lg:col-span-6 text-xs truncate" style={{ color: "var(--color-muted)" }}>
                    {p ? (
                      <>
                        <span style={{ color: p.sender_role === "customer" ? "var(--color-cobalt)" : "var(--color-emerald)" }}>
                          {p.sender_role === "customer" ? "→" : "←"}
                        </span>{" "}
                        {p.body}
                      </>
                    ) : "(no messages)"}
                  </span>
                  <span className="col-span-6 lg:col-span-2 text-[10px] tabular-nums tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                    {formatRelative(t.last_message_at)}
                  </span>
                  <span className="col-span-6 lg:col-span-1 text-right text-[10px] tracking-[0.18em] uppercase" style={{ color: t.status === "open" ? "var(--color-saffron)" : "var(--color-muted)" }}>
                    {t.status}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
