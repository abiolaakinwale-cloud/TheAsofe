// One-off: create three demo accounts (customer / brand / staff) with random
// passwords. Idempotent — if the email already exists we just reset its
// password and re-apply the role/brand. Prints credentials at the end.
//
//   node scripts/create-demo-accounts.mjs

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Pick a brand that genuinely exists to attach to the demo brand account.
const DEMO_BRAND_SLUG = "atelier-adunni";

const accounts = [
  { kind: "customer", email: "demo.customer@theasofe.com", role: "visitor", brand: null,            login: "/signin"        },
  { kind: "brand",    email: "demo.brand@theasofe.com",    role: "seller",  brand: DEMO_BRAND_SLUG,  login: "/brand-signin"  },
  { kind: "staff",    email: "demo.staff@theasofe.com",    role: "admin",   brand: null,            login: "/admin-signin"  },
];

function randomPassword() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(14);
  let s = "";
  for (let i = 0; i < 14; i++) s += alpha[bytes[i] % alpha.length];
  return s + "!" + ((bytes[0] % 9) + 1);
}

async function findUserByEmail(email) {
  const { data, error } = await sb.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

const results = [];

for (const a of accounts) {
  const password = randomPassword();
  let user = await findUserByEmail(a.email);

  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email: a.email,
      password,
      email_confirm: true, // bypass the confirm-email flow for demo accounts
    });
    if (error) {
      console.error(`✗ ${a.email}:`, error.message);
      continue;
    }
    user = data.user;
    console.log(`✓ created ${a.email}`);
  } else {
    const { error } = await sb.auth.admin.updateUserById(user.id, { password });
    if (error) {
      console.error(`✗ ${a.email}:`, error.message);
      continue;
    }
    console.log(`✓ reset password for ${a.email}`);
  }

  // Upsert the profile row with the desired role + brand. The handle_new_user
  // trigger may have created a row already with role=visitor; we overwrite.
  // Demo customer is pre-approved so they can reach checkout without manual review.
  const profilePayload = {
    id: user.id, email: a.email, role: a.role, brand: a.brand,
    customer_status: a.role === "visitor" ? "approved" : "pending",
  };
  const { error: pErr } = await sb.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (pErr) {
    console.error(`  · profile update failed for ${a.email}:`, pErr.message);
    continue;
  }

  results.push({ ...a, password });
}

console.log("\n=== Demo credentials ===\n");
for (const r of results) {
  console.log(`${r.kind.padEnd(8)} · ${r.login}`);
  console.log(`  email:    ${r.email}`);
  console.log(`  password: ${r.password}`);
  if (r.brand) console.log(`  brand:    ${r.brand}`);
  console.log("");
}
console.log("Rotate or delete these accounts when the demo is over.\n");
