import { NextResponse, type NextRequest } from "next/server";
import { captureGuestEmail } from "@/lib/cart-snapshot";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Guest email capture on /bag. Stores email in a cookie so the abandonment
// cron can reach this visitor even if they never sign in. Also subscribes
// them to the newsletter list (idempotent) so they receive future drops.
export async function POST(request: NextRequest) {
  let body: { email?: string } = {};
  try { body = await request.json(); } catch { /* empty payload */ }
  const email = (body.email ?? "").trim();
  if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });

  try {
    await captureGuestEmail(email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid email";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  // Best-effort newsletter mirror — never fail the capture if this errors.
  try {
    const sb = getAdminSupabase();
    await sb.from("newsletter_subscribers").upsert(
      { email: email.toLowerCase(), source: "bag_capture" },
      { onConflict: "email", ignoreDuplicates: true },
    );
  } catch (err) {
    console.error("[bag/email] newsletter mirror failed", err);
  }

  return NextResponse.json({ ok: true });
}
