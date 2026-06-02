import { randomBytes } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/admin";

// One short word + 4 random alpha — e.g. "ASOFE-W7K3", "ASOFE-J5MX". Easy to
// type, low collision risk. Two retries on collision before giving up.
export function generateReferralCode(seed?: string | null): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(4);
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += alpha[bytes[i] % alpha.length];
  // Use first 4 chars of seed (e.g. email local part) if provided + alphanumeric
  const seedPart = seed?.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 4);
  return seedPart ? `${seedPart}${suffix}` : `ASOFE${suffix}`;
}

/**
 * Get or create the referral code for a profile. Lazy generation on first
 * /account/referrals visit. Idempotent — returns the existing code if one
 * is already on the profile.
 */
export async function getOrCreateReferralCode(userId: string, emailLocalPart?: string | null): Promise<string> {
  const admin = getAdminSupabase();
  const { data: profile } = await admin
    .from("profiles")
    .select("referral_code, email")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.referral_code) return profile.referral_code;

  const seed = emailLocalPart ?? profile?.email?.split("@")[0] ?? null;
  // Up to 3 attempts on unique-constraint collision
  for (let i = 0; i < 3; i++) {
    const code = generateReferralCode(seed);
    const { error } = await admin
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", userId);
    if (!error) return code;
  }
  // Fallback — pure random (no seed)
  const code = generateReferralCode(null);
  await admin.from("profiles").update({ referral_code: code }).eq("id", userId);
  return code;
}

export const REFERRAL_REWARD_PENCE = 2500;  // £25 for both referrer + referee
