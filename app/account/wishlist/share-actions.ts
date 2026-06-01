"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { getServerSupabase } from "@/lib/supabase/server";

function newToken(): string {
  // 18-character base32 token, e.g. "wl-A3K5Z9TPMQXNRDEHFG"
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no-confusables
  const bytes = randomBytes(18);
  let s = "";
  for (let i = 0; i < 18; i++) s += alpha[bytes[i] % alpha.length];
  return `wl-${s}`;
}

async function getUser() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Please sign in.");
  return { sb, user };
}

export async function enableWishlistSharing(formData: FormData) {
  const { sb, user } = await getUser();
  const displayName = String(formData.get("display_name") || "").trim().slice(0, 60) || null;
  const message     = String(formData.get("message") || "").trim().slice(0, 200) || null;

  // Upsert: if a row already exists for this user, reactivate it + update copy;
  // otherwise create with a fresh token.
  const { data: existing } = await sb
    .from("wishlist_shares")
    .select("token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await sb
      .from("wishlist_shares")
      .update({
        is_active: true,
        display_name: displayName,
        message,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  } else {
    await sb.from("wishlist_shares").insert({
      user_id: user.id,
      token: newToken(),
      display_name: displayName,
      message,
    });
  }

  revalidatePath("/account/wishlist");
}

export async function rotateWishlistToken() {
  const { sb, user } = await getUser();
  await sb
    .from("wishlist_shares")
    .update({ token: newToken(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  revalidatePath("/account/wishlist");
}

export async function disableWishlistSharing() {
  const { sb, user } = await getUser();
  await sb
    .from("wishlist_shares")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  revalidatePath("/account/wishlist");
}

export async function updateShareCopy(formData: FormData) {
  const { sb, user } = await getUser();
  const displayName = String(formData.get("display_name") || "").trim().slice(0, 60) || null;
  const message     = String(formData.get("message") || "").trim().slice(0, 200) || null;
  await sb
    .from("wishlist_shares")
    .update({ display_name: displayName, message, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  revalidatePath("/account/wishlist");
}
