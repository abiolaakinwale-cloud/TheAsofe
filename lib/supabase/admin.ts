import "server-only";
import { createClient } from "@supabase/supabase-js";

// Bypasses RLS — only use in server actions / route handlers that already
// authorised the caller. Never expose this client to a browser bundle.
export function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
