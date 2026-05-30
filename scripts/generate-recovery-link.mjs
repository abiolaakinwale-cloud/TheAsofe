// One-off: generate a password-recovery link for a given email using the
// Supabase service-role key. Prints a URL the user can click to land on
// /auth/reset signed in, where they can set a new password.
//
//   node scripts/generate-recovery-link.mjs <email>

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/generate-recovery-link.mjs <email>");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const redirectTo = "https://theasofe.vercel.app/auth/callback?next=/auth/reset";

const { data, error } = await sb.auth.admin.generateLink({
  type: "recovery",
  email,
  options: { redirectTo },
});

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

console.log("\n=== Recovery link for " + email + " ===\n");
console.log(data.properties.action_link);
console.log("\nClick this link once. It'll land you on /auth/reset signed in;");
console.log("set your new password from there. Link is single-use and short-lived.\n");
