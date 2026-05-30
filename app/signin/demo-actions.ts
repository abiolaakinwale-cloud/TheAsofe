"use server";

import { randomBytes } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";

export type DemoRole = "customer" | "brand" | "staff";

const DEMO_ACCOUNTS: Record<
  DemoRole,
  { email: string; role: "visitor" | "seller" | "admin"; brand: string | null }
> = {
  customer: { email: "demo.customer@theasofe.com", role: "visitor", brand: null },
  brand:    { email: "demo.brand@theasofe.com",    role: "seller",  brand: "atelier-adunni" },
  staff:    { email: "demo.staff@theasofe.com",    role: "admin",   brand: null },
};

export type DemoCredentialsResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

function randomPassword(): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(14);
  let s = "";
  for (let i = 0; i < 14; i++) s += alpha[bytes[i] % alpha.length];
  return s + "!" + ((bytes[0] % 9) + 1);
}

/**
 * Provision (or refresh) the demo account for a given audience and return its
 * credentials. Each call rotates the password — anyone holding the previous
 * one is logged out at the next session refresh.
 *
 * Service-role only, but exposed publicly: the caller is anonymous. Designed
 * for demos / quick onboarding; not a real authentication primitive.
 */
export async function generateDemoCredentials(role: DemoRole): Promise<DemoCredentialsResult> {
  const account = DEMO_ACCOUNTS[role];
  if (!account) return { ok: false, error: "Unknown role." };

  const sb = getAdminSupabase();
  const password = randomPassword();

  // Find or create the user.
  const { data: list, error: listErr } = await sb.auth.admin.listUsers();
  if (listErr) return { ok: false, error: listErr.message };
  let user = list.users.find(u => u.email?.toLowerCase() === account.email.toLowerCase()) ?? null;

  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
    });
    if (error) return { ok: false, error: error.message };
    user = data.user;
  } else {
    const { error } = await sb.auth.admin.updateUserById(user.id, { password });
    if (error) return { ok: false, error: error.message };
  }

  // Make sure profile role / brand match the intended audience. The trigger
  // creates a row at sign-up; we overwrite it here.
  if (user) {
    const { error } = await sb.from("profiles").upsert(
      { id: user.id, email: account.email, role: account.role, brand: account.brand },
      { onConflict: "id" }
    );
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true, email: account.email, password };
}
