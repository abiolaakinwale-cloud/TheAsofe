import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { buildSellerRecap } from "@/lib/seller-recap";
import { notifyDesignerMonthlyRecap } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Monthly cron (1st of month, 09:00 UTC): sends each designer a recap of the
 * previous calendar month — sales, payouts, top-selling piece, demand signal
 * from wishlists, and any pending Q&A. Idempotent via brands.last_recap_sent_at:
 * if the stamp is already inside the recap period being sent, we skip the row.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  } else {
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const host = request.headers.get("host") ?? "";
    if (!isVercelCron && !host.startsWith("localhost")) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 401 });
    }
  }

  // Previous calendar month bounds in UTC
  const now = new Date();
  const periodEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),     0)); // last day of prev month
  const periodStart = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), 1));
  const startISO = periodStart.toISOString().slice(0, 10);
  const endISO   = periodEnd.toISOString().slice(0, 10);
  const periodLabel = periodStart.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const periodStartStamp = periodStart.toISOString();

  const sb = getAdminSupabase();
  const { data: brands, error } = await sb
    .from("brands")
    .select("slug, name, last_recap_sent_at")
    .order("slug", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  const results: { brand: string; status: "sent" | "skipped"; reason?: string }[] = [];

  for (const b of brands ?? []) {
    // Idempotency: already sent for this period (or later)?
    if (b.last_recap_sent_at && new Date(b.last_recap_sent_at).getTime() >= periodStart.getTime() + 32 * 86_400_000) {
      // stamp is from on or after the 1st of *next* month → already ran
      skipped++; results.push({ brand: b.slug, status: "skipped", reason: "already sent this period" });
      continue;
    }

    // Find seller for this brand. Take the oldest seller account on the brand.
    const { data: seller } = await sb
      .from("profiles")
      .select("email, created_at")
      .eq("brand", b.slug)
      .eq("role", "seller")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!seller?.email) {
      skipped++; results.push({ brand: b.slug, status: "skipped", reason: "no seller email" });
      continue;
    }

    const recap = await buildSellerRecap(b.slug, startISO, endISO);
    if (!recap) { skipped++; results.push({ brand: b.slug, status: "skipped", reason: "no recap" }); continue; }

    try {
      await notifyDesignerMonthlyRecap({
        sellerEmail: seller.email,
        brandName: recap.brandName,
        brandSlug: recap.brand,
        periodLabel,
        delivered_orders: recap.delivered_orders,
        pieces_sold: recap.pieces_sold,
        gross_pence: recap.gross_pence,
        pending_payout_pence: recap.pending_payout_pence,
        top_piece: recap.top_piece,
        top_wishlisted: recap.top_wishlisted,
        new_reviews: recap.new_reviews,
        new_review_avg: recap.new_review_avg,
        pending_questions: recap.pending_questions,
      });
      await sb.from("brands").update({ last_recap_sent_at: new Date().toISOString() }).eq("slug", b.slug);
      await logAction({
        action: "monthly_recap.sent",
        targetType: "brand",
        targetId: b.slug,
        metadata: { period: `${startISO}…${endISO}`, pieces_sold: recap.pieces_sold, gross_pence: recap.gross_pence },
      });
      sent++; results.push({ brand: b.slug, status: "sent" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      skipped++; results.push({ brand: b.slug, status: "skipped", reason: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    period: { start: startISO, end: endISO, label: periodLabel, stamp: periodStartStamp },
    scanned: brands?.length ?? 0,
    sent,
    skipped,
    results: results.slice(0, 50),
  });
}
