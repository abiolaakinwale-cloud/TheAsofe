import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

/**
 * Append a row to the audit_log table. Best-effort — never throws upstream,
 * so the underlying action that triggered it always completes even if the
 * log write fails. Reads the current user from cookies so callers don't need
 * to pass it through.
 *
 * Use a dotted naming scheme for `action`:
 *   "order.status_changed", "order.dispatched"
 *   "return.received", "return.refund_approved", "return.rejected"
 *   "payout.generated", "payout.statement_sent", "payout.marked_paid", "payout.cancelled"
 *   "brand.created", "brand.updated"
 *   "shipment.created", "shipment.inducted"
 *   "application.approved", "application.rejected"
 *
 * Keep metadata small + JSON-serialisable: status transitions, ids of
 * touched rows, amounts, etc.
 */
export async function logAction(args: {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const sb = await getServerSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const admin = getAdminSupabase();
    const { error } = await admin.from("audit_log").insert({
      actor_id:    user?.id ?? null,
      actor_email: user?.email ?? null,
      action:      args.action,
      target_type: args.targetType ?? null,
      target_id:   args.targetId ?? null,
      metadata:    args.metadata ?? {},
    });
    if (error) console.error("[audit] log failed", args.action, error);
  } catch (err) {
    console.error("[audit] log threw", args.action, err);
  }
}
