import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyGiftCardIssued } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily cron: finds gift cards with scheduled_send_at <= today that haven't
 * been delivered yet, sends the recipient their code, and stamps delivered_at
 * so the same card is never sent twice.
 *
 * Companion to the immediate-delivery path in the Stripe webhook — cards
 * with a future scheduled_send_at skip the webhook send and land here on
 * the right morning.
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

  const today = new Date().toISOString().slice(0, 10);
  const sb = getAdminSupabase();

  const { data: due, error } = await sb
    .from("gift_cards")
    .select("id, code, balance_pence, recipient_email, recipient_name, purchaser_email, personal_message, expires_at")
    .eq("status", "active")
    .lte("scheduled_send_at", today)
    .is("delivered_at", null)
    .not("recipient_email", "is", null)
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = due ?? [];
  const results: { id: string; status: "sent" | "skipped"; reason?: string }[] = [];
  let sent = 0;

  for (const card of rows) {
    try {
      await notifyGiftCardIssued({
        toEmail: card.recipient_email!,
        toName: card.recipient_name,
        fromName: card.purchaser_email,
        code: card.code,
        amountPence: card.balance_pence,
        message: card.personal_message,
        expiresAt: card.expires_at,
      });
      await sb
        .from("gift_cards")
        .update({ delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", card.id);
      sent++;
      results.push({ id: card.id, status: "sent" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: card.id, status: "skipped", reason: msg });
      // Don't stamp delivered_at on failure — retries tomorrow
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    sent,
    today,
    results: results.slice(0, 20),
  });
}
