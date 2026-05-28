"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthResult = { ok: true } | { ok: false; error: string };

function originFor(hdrs: Headers): string {
  return hdrs.get("origin") ?? `https://${hdrs.get("host") ?? "theasofe.vercel.app"}`;
}

function validate(email: string, password: string): string | null {
  if (!email?.includes("@")) return "Enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export async function logIn(email: string, password: string): Promise<AuthResult> {
  const err = validate(email, password);
  if (err) return { ok: false, error: err };

  const sb = await getServerSupabase();
  const { error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    // Don't leak whether the email exists — same message either way.
    return { ok: false, error: "Email or password is incorrect." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const err = validate(email, password);
  if (err) return { ok: false, error: err };

  const sb = await getServerSupabase();
  const hdrs = await headers();
  const { data, error } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { emailRedirectTo: `${originFor(hdrs)}/auth/callback` },
  });
  if (error) return { ok: false, error: error.message };

  // If email-confirmation is OFF in Supabase, signUp returns a session and the
  // cookie is set — they're logged in already. If confirmation is ON, no session
  // is returned and they need to click the confirm link.
  if (data.session) {
    revalidatePath("/", "layout");
    return { ok: true };
  }
  return { ok: false, error: "Account created. Check your email to confirm before logging in." };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!email?.includes("@")) return { ok: false, error: "Enter a valid email address." };
  const sb = await getServerSupabase();
  const hdrs = await headers();
  const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${originFor(hdrs)}/auth/callback?next=/auth/reset`,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const sb = await getServerSupabase();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  const sb = await getServerSupabase();
  await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
