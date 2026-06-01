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

function formatTs(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AuditPanel({
  targetType,
  targetId,
  limit = 10,
}: {
  targetType: "order" | "return" | "payout" | "brand" | "shipment";
  targetId: string;
  limit?: number;
}) {
  const sb = getAdminSupabase();
  const { data: rows } = await sb
    .from("audit_log")
    .select("id, actor_email, action, metadata, created_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) {
    return (
      <div className="p-5 text-xs" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)", color: "var(--color-muted)" }}>
        <p className="eyebrow mb-3" style={{ color: "var(--color-muted)" }}>Activity</p>
        <p>No admin events recorded for this {targetType} yet.</p>
      </div>
    );
  }

  return (
    <div className="p-5" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <div className="flex items-baseline justify-between mb-3">
        <p className="eyebrow" style={{ color: "var(--color-muted)" }}>Activity</p>
        <Link
          href={`/admin/audit?target=${targetType}`}
          className="text-[10px] tracking-[0.18em] uppercase lux-link"
          style={{ color: "var(--color-muted)" }}
        >
          Full log →
        </Link>
      </div>
      <ul className="space-y-3">
        {rows.map(r => {
          const meta = r.metadata as Record<string, unknown> | null;
          const metaSummary = meta && Object.keys(meta).length > 0
            ? Object.entries(meta).slice(0, 3).map(([k, v]) => `${k}=${String(v)}`).join(" · ")
            : null;
          return (
            <li key={r.id} className="text-xs">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="text-[10px] tracking-[0.18em] uppercase font-medium"
                  style={{ color: ACTION_COLOURS[r.action] ?? "var(--color-ink)" }}
                >
                  {r.action}
                </span>
                <span className="tabular-nums whitespace-nowrap" style={{ color: "var(--color-muted)" }}>
                  {formatTs(r.created_at)}
                </span>
              </div>
              <p className="mt-1" style={{ color: "var(--color-muted)" }}>
                {r.actor_email ?? "system"}
                {metaSummary && (
                  <span className="font-mono ml-2 text-[10px]" title={metaSummary}>· {metaSummary}</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
