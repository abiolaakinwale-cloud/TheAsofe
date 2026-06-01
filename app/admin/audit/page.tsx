import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";

const ACTION_COLOURS: Record<string, string> = {
  "order.status_changed":   "var(--color-cobalt)",
  "order.dispatched":       "var(--color-emerald)",
  "return.received":        "var(--color-cobalt)",
  "return.refund_approved": "var(--color-emerald)",
  "return.rejected":        "var(--color-oxblood)",
  "payout.generated":       "var(--color-cobalt)",
  "payout.statement_sent":  "var(--color-saffron)",
  "payout.marked_paid":     "var(--color-emerald)",
  "payout.cancelled":       "var(--color-oxblood)",
  "brand.created":          "var(--color-emerald)",
  "brand.updated":          "var(--color-muted)",
};

function targetLink(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  switch (type) {
    case "order":   return `/admin/orders/${id}`;
    case "return":  return `/admin/returns/${id}`;
    case "payout":  return `/admin/payouts/${id}`;
    case "brand":   return `/admin/brands/${id}/edit`;
    default: return null;
  }
}

function formatTs(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; target?: string }>;
}) {
  const { action, actor, target } = await searchParams;

  const sb = getAdminSupabase();
  let q = sb
    .from("audit_log")
    .select("id, actor_email, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (action) q = q.eq("action", action);
  if (actor)  q = q.eq("actor_email", actor);
  if (target) q = q.eq("target_type", target);

  const { data: rows } = await q;

  // Distinct action types for the filter pills
  const { data: actionRows } = await sb
    .from("audit_log")
    .select("action")
    .order("action");
  const actionCounts = new Map<string, number>();
  for (const r of actionRows ?? []) {
    actionCounts.set(r.action, (actionCounts.get(r.action) ?? 0) + 1);
  }

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Activity</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        {rows?.length ?? 0} {action ? `${action} ` : ""}{(rows?.length ?? 0) === 1 ? "event" : "events"}.
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        Append-only log of every admin write. Most recent first. Showing the latest 200.
      </p>

      <nav className="flex flex-wrap gap-x-5 gap-y-2 mb-10 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/audit" className="lux-link" style={{ color: !action && !actor && !target ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
        {Array.from(actionCounts.entries()).map(([a, n]) => (
          <Link
            key={a}
            href={`/admin/audit?action=${encodeURIComponent(a)}`}
            className="lux-link"
            style={{ color: action === a ? (ACTION_COLOURS[a] ?? "var(--color-ink)") : "var(--color-muted)" }}
          >
            {a} ({n})
          </Link>
        ))}
        {(actor || target) && (
          <span className="ml-auto" style={{ color: "var(--color-cobalt)" }}>
            {actor && <>actor: {actor} · </>}
            {target && <>target: {target} · </>}
            <Link href="/admin/audit" className="lux-link">clear</Link>
          </span>
        )}
      </nav>

      {!rows || rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No activity yet.</p>
      ) : (
        <ul className="space-y-px">
          {rows.map(r => {
            const href = targetLink(r.target_type, r.target_id);
            const meta = r.metadata as Record<string, unknown> | null;
            const metaSummary = meta && Object.keys(meta).length > 0
              ? Object.entries(meta).slice(0, 4).map(([k, v]) => `${k}=${String(v)}`).join(" · ")
              : null;
            return (
              <li key={r.id} className="grid grid-cols-12 gap-4 items-baseline p-4 text-sm" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                <span className="col-span-12 lg:col-span-2 text-xs tabular-nums" style={{ color: "var(--color-muted)" }}>
                  {formatTs(r.created_at)}
                </span>
                <span
                  className="col-span-6 lg:col-span-3 text-[10px] tracking-[0.18em] uppercase font-medium"
                  style={{ color: ACTION_COLOURS[r.action] ?? "var(--color-ink)" }}
                >
                  {r.action}
                </span>
                <span className="col-span-6 lg:col-span-3 truncate">
                  {r.target_type && r.target_id && (
                    href ? (
                      <Link href={href} className="lux-link font-mono text-xs" style={{ color: "var(--color-ink)" }}>
                        {r.target_type}/{r.target_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                        {r.target_type}/{r.target_id.slice(0, 8)}
                      </span>
                    )
                  )}
                </span>
                <span className="col-span-12 lg:col-span-2 text-xs truncate" style={{ color: "var(--color-muted)" }}>
                  {r.actor_email ? (
                    <Link href={`/admin/audit?actor=${encodeURIComponent(r.actor_email)}`} className="lux-link">
                      {r.actor_email}
                    </Link>
                  ) : "system"}
                </span>
                <span className="col-span-12 lg:col-span-2 text-[11px] truncate font-mono" style={{ color: "var(--color-muted)" }} title={metaSummary ?? ""}>
                  {metaSummary}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
