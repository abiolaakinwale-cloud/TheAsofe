// One-off: set a user's password directly via the admin API + ensure their
// profile role. Service-role only. Use sparingly.
//
//   node scripts/admin-set-password.mjs <email> [--promote-admin]

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const email = process.argv[2];
const promoteAdmin = process.argv.includes("--promote-admin");
if (!email) {
  console.error("Usage: node scripts/admin-set-password.mjs <email> [--promote-admin]");
  process.exit(1);
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Find the user
const { data: list, error: listErr } = await sb.auth.admin.listUsers();
if (listErr) { console.error("list failed:", listErr.message); process.exit(1); }
const user = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
if (!user) { console.error("No user with email:", email); process.exit(1); }

// Generate a temporary password (URL-safe, no ambiguous chars)
const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const bytes = randomBytes(16);
let temp = "";
for (let i = 0; i < 16; i++) temp += alpha[bytes[i] % alpha.length];
temp = temp + "!" + (bytes[0] % 9 + 1); // ensure a symbol + digit

// Set the password
const { error: updErr } = await sb.auth.admin.updateUserById(user.id, { password: temp });
if (updErr) { console.error("update failed:", updErr.message); process.exit(1); }

// Optional: promote to admin in our profiles table
if (promoteAdmin) {
  const { error: pErr } = await sb.from("profiles").upsert({
    id: user.id,
    email: user.email,
    role: "admin",
  }, { onConflict: "id" });
  if (pErr) { console.error("role update failed:", pErr.message); process.exit(1); }
  console.log("✓ Promoted to admin.");
}

console.log("\n=== Password reset for " + user.email + " ===");
console.log("Temporary password: " + temp);
console.log("\nLog in at https://theasofe.vercel.app/signin");
console.log("Then go to /account and change the password immediately.\n");
