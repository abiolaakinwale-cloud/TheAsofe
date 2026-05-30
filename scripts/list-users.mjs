import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await sb.auth.admin.listUsers();
if (error) { console.error(error.message); process.exit(1); }
for (const u of data.users) console.log(u.email, "·", u.id.slice(0, 8), "· created:", u.created_at?.slice(0, 10));
