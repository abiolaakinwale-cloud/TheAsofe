import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nightly REFRESH MATERIALIZED VIEW for the bag cross-sell recommendations.
// Costs are proportional to order_items count; safe even with thousands of
// orders. Run after order activity quietens (default 02:30 GMT).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    if (request.headers.get("x-vercel-cron") !== "1") {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  }

  const sb = getAdminSupabase();
  // Plain REFRESH (not CONCURRENTLY) — the view is small and bag pages cope
  // with a brief read lock. Swap to CONCURRENTLY if it ever becomes hot.
  const { error } = await sb.rpc("refresh_copurchases");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, refreshed_at: new Date().toISOString() });
}
