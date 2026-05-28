import { createClient } from "@supabase/supabase-js";

// Stateless anon client. Use for public reads (catalog) and from contexts
// without an HTTP request (e.g. generateStaticParams at build time).
// RLS still enforces row visibility — this client just doesn't carry a session.
export function getAnonSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
