import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyReviewPrompt } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_PROMPT_AFTER_DAYS = 14;

/**
 * Daily cron: finds orders delivered ≥ 14 days ago that haven't yet received
 * a review prompt, sends the email, and stamps review_prompt_sent_at so it
 * never fires twice for the same order.
 *
 * Authorisation: Vercel sets the `Authorization: Bearer <CRON_SECRET>` header
 * automatically when invoking a cron defined in vercel.json. Locally, set
 * CRON_SECRET in .env.local to hit the route via curl for testing.
 */
export async function GET(request: NextRequest) {
  // Auth — Vercel sets this header when invoking from the cron schedule
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  } else {
    // If unset, refuse external traffic to be safe — only allow Vercel's own
    // cron-source request (which sets `x-vercel-cron: 1`) or localhost.
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const host = request.headers.get("host") ?? "";
    if (!isVercelCron && !host.startsWith("localhost")) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 401 });
    }
  }

  const sb = getAdminSupabase();
  const cutoff = new Date(Date.now() - REVIEW_PROMPT_AFTER_DAYS * 86_400_000).toISOString();

  // Window: orders.status = delivered AND delivered_at <= cutoff AND
  //         review_prompt_sent_at IS NULL AND customer_email IS NOT NULL
  const { data: orders, error } = await sb
    .from("orders")
    .select("id, customer_email, delivered_at, order_items(product_slug, name)")
    .eq("status", "delivered")
    .lte("delivered_at", cutoff)
    .is("review_prompt_sent_at", null)
    .not("customer_email", "is", null)
    .limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Order = {
    id: string;
    customer_email: string;
    delivered_at: string;
    order_items: { product_slug: string; name: string }[];
  };
  const rows = (orders ?? []) as unknown as Order[];

  let sent = 0;
  let skipped = 0;
  const results: { order_id: string; status: "sent" | "skipped"; reason?: string }[] = [];

  for (const o of rows) {
    if (!o.order_items?.length) {
      skipped++;
      results.push({ order_id: o.id, status: "skipped", reason: "no items" });
      continue;
    }
    try {
      await notifyReviewPrompt({
        customerEmail: o.customer_email,
        orderId: o.id,
        items: o.order_items.map(i => ({ name: i.name, productSlug: i.product_slug })),
      });
      await sb
        .from("orders")
        .update({ review_prompt_sent_at: new Date().toISOString() })
        .eq("id", o.id);
      sent++;
      results.push({ order_id: o.id, status: "sent" });
    } catch (err) {
      skipped++;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ order_id: o.id, status: "skipped", reason: msg });
      // Don't stamp on failure so it retries tomorrow
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    sent,
    skipped,
    cutoff,
    results: results.slice(0, 20),
  });
}
