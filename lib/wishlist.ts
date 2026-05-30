import "server-only";
import { getServerSupabase } from "./supabase/server";

/**
 * Returns the set of product slugs the current user has wishlisted.
 * Returns an empty Set when no user is signed in (the heart still renders
 * — clicking it just redirects to /signin).
 */
export async function getWishlistSlugs(): Promise<Set<string>> {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Set();
  const { data } = await sb
    .from("wishlist")
    .select("product_slug")
    .eq("user_id", user.id);
  return new Set((data ?? []).map(r => r.product_slug));
}
