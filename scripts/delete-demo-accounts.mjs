// One-off: delete the three demo accounts created by create-demo-accounts.mjs.
// Idempotent — missing accounts are skipped quietly.
//
//   node scripts/delete-demo-accounts.mjs
//
// Cascade behaviour:
//   profiles.id    → on delete cascade  → profile row is removed automatically
//   applications.applicant_user_id → on delete set null → app row stays, link null
//   orders.customer_id             → on delete set null → orders persist as guest
//   addresses.customer_id          → on delete set null → addresses persist
//
// To also wipe lingering addresses/orders, pass --hard:
//   node scripts/delete-demo-accounts.mjs --hard

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const HARD = process.argv.includes("--hard");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const emails = [
  "demo.customer@theasofe.com",
  "demo.brand@theasofe.com",
  "demo.staff@theasofe.com",
];

async function findUserByEmail(email) {
  const { data, error } = await sb.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

for (const email of emails) {
  const user = await findUserByEmail(email);
  if (!user) {
    console.log(`· ${email}: not found, skipping`);
    continue;
  }

  if (HARD) {
    // Remove anything the cascade leaves behind. Orders + addresses go to NULL
    // on delete (FK on_delete = set null); --hard wipes those rows too.
    await sb.from("addresses").delete().eq("customer_id", user.id);
    await sb.from("orders").delete().eq("customer_id", user.id);
    console.log(`  · ${email}: hard-cleanup (addresses, orders)`);
  }

  const { error } = await sb.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`✗ ${email}: ${error.message}`);
    continue;
  }
  console.log(`✓ ${email}: deleted (profile cascades)`);
}

console.log("\nDone. Run scripts/create-demo-accounts.mjs to provision a fresh set.\n");
