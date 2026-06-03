import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyAbandonedCart } from "@/lib/notifications";
import { issueRecoveryDiscount, RECOVERY_PERCENT } from "@/lib/discounts";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cadence: stage 1 at T+1h (gentle nudge), stage 2 at T+24h (offer 10%),
// stage 3 at T+72h (last call). Never send to opted-out users.
const STAGES = [
  { stage: 1, afterMs: 1  * 3_600_000, withDiscount: false },
  { stage: 2, afterMs: 24 * 3_600_000, withDiscount: true  },
  { stage: 3, afterMs: 72 * 3_600_000, withDiscount: true  },
];

const BATCH_LIMIT = 100;

function isAuthed(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  return request.headers.get("x-vercel-cron") === "1" || (request.headers.get("host") ?? "").startsWith("localhost");
}

type Snapshot = {
  identity: string;
  user_id: string | null;
  email: string;
  items: { slug: string; size: string; qty: number; colour?: string }[];
  subtotal: number;
  recovery_token: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const sb = getAdminSupabase();
  const now = Date.now();

  // Pull recent snapshots + their abandonment state. The window is the
  // oldest stage's threshold so we don't scan the whole table forever.
  const oldestWindow = new Date(now - 14 * 86_400_000).toISOString();
  const { data: snapshotsRaw, error } = await sb
    .from("bag_snapshots")
    .select("identity, user_id, email, items, subtotal, recovery_token, updated_at")
    .gte("updated_at", oldestWindow)
    .order("updated_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const snapshots = (snapshotsRaw ?? []) as Snapshot[];
  if (snapshots.length === 0) return NextResponse.json({ ok: true, scanned: 0, sent: 0 });

  // Hydrate state + opt-in flags in two batched lookups.
  const identities = snapshots.map(s => s.identity);
  const userIds = snapshots.map(s => s.user_id).filter((x): x is string => !!x);

  const [{ data: states }, { data: profiles }] = await Promise.all([
    sb.from("cart_abandonment_state").select("identity, stage, last_sent_at").in("identity", identities),
    userIds.length > 0
      ? sb.from("profiles").select("id, marketing_opt_in").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const stateBy   = new Map((states   ?? []).map(s => [s.identity, s]));
  const optInBy   = new Map((profiles ?? []).map(p => [p.id as string, !!p.marketing_opt_in]));

  let sent = 0;
  const results: { identity: string; stage: number; outcome: "sent" | "skipped"; reason?: string }[] = [];

  for (const snap of snapshots) {
    if (!snap.email || snap.items.length === 0) continue;

    // Signed-in users must have opt-in. Guest snapshots come from email
    // capture on /bag (which implies consent for transactional follow-up).
    if (snap.user_id && !optInBy.get(snap.user_id)) {
      results.push({ identity: snap.identity, stage: 0, outcome: "skipped", reason: "opt-out" });
      continue;
    }

    const state    = stateBy.get(snap.identity) ?? { identity: snap.identity, stage: 0, last_sent_at: null };
    const nextStep = STAGES.find(s => s.stage === state.stage + 1);
    if (!nextStep) continue; // already at stage 3, nothing more to send

    const elapsed = now - new Date(snap.updated_at).getTime();
    if (elapsed < nextStep.afterMs) continue;

    let discountCode: string | null = null;
    if (nextStep.withDiscount) {
      try {
        const dc = await issueRecoveryDiscount(snap.email);
        discountCode = dc.code;
      } catch (err) {
        console.error("[abandoned-cart] discount mint failed", err);
      }
    }

    try {
      await notifyAbandonedCart({
        email:           snap.email,
        items:           snap.items,
        subtotal:        snap.subtotal,
        recoveryToken:   snap.recovery_token,
        discountCode,
        discountPercent: discountCode ? RECOVERY_PERCENT : null,
        stage:           nextStep.stage,
      });
      await sb.from("cart_abandonment_state").upsert({
        identity:     snap.identity,
        stage:        nextStep.stage,
        last_sent_at: new Date().toISOString(),
      }, { onConflict: "identity" });

      await track("cart_abandonment_recovered", { userId: snap.user_id, email: snap.email }, {
        stage:    nextStep.stage,
        subtotal: snap.subtotal,
        items:    snap.items.length,
        had_discount: !!discountCode,
      });
      sent++;
      results.push({ identity: snap.identity, stage: nextStep.stage, outcome: "sent" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ identity: snap.identity, stage: nextStep.stage, outcome: "skipped", reason: msg });
    }
  }

  return NextResponse.json({ ok: true, scanned: snapshots.length, sent, results: results.slice(0, 20) });
}
