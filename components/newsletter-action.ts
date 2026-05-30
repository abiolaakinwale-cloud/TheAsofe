"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";

export type SubscribeResult = { ok: true } | { ok: false; error: string };

export async function subscribeToNewsletter(email: string, source: string): Promise<SubscribeResult> {
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@") || clean.length > 200) {
    return { ok: false, error: "Enter a valid email." };
  }

  // Service-role insert — table accepts anonymous inserts via RLS, but we use
  // the admin client so duplicate-detection (PK conflict) is consistent.
  const sb = getAdminSupabase();
  const { error } = await sb
    .from("newsletter_subscribers")
    .insert({ email: clean, source });

  if (error) {
    // 23505 = unique_violation — they're already subscribed. Treat as success.
    if ((error as { code?: string }).code === "23505") return { ok: true };
    return { ok: false, error: "Couldn't save your subscription. Try again." };
  }
  return { ok: true };
}
