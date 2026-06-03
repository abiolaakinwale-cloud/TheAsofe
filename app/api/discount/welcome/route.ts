import { NextResponse, type NextRequest } from "next/server";
import { issueWelcomeDiscount, WELCOME_PERCENT, WELCOME_EXPIRY_DAYS } from "@/lib/discounts";
import { notifyWelcomeOffer } from "@/lib/notifications";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Welcome modal email capture → issue 10% off code + mail it. Idempotent on
// email so spamming the form does not mint a wall of codes.
export async function POST(request: NextRequest) {
  let body: { email?: string } = {};
  try { body = await request.json(); } catch { /* empty */ }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email" }, { status: 400 });
  }

  try {
    const dc = await issueWelcomeDiscount(email);

    // Mirror to newsletter list so the visitor gets future drops too.
    const sb = getAdminSupabase();
    await sb.from("newsletter_subscribers").upsert(
      { email, source: "welcome_modal" },
      { onConflict: "email", ignoreDuplicates: true },
    );

    await notifyWelcomeOffer({
      email,
      code:    dc.code,
      percent: WELCOME_PERCENT,
      expiryDays: WELCOME_EXPIRY_DAYS,
    });

    return NextResponse.json({ ok: true, code: dc.code, percent: WELCOME_PERCENT });
  } catch (err) {
    console.error("[discount/welcome] failed", err);
    return NextResponse.json({ ok: false, error: "Could not issue code" }, { status: 500 });
  }
}
