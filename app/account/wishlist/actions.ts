"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export async function toggleWishlist(slug: string, returnTo?: string): Promise<void> {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(returnTo ?? `/products/${slug}`)}`);
  }

  // Toggle by trying to insert; on conflict (already wishlisted), delete it.
  const { error: insertErr } = await sb
    .from("wishlist")
    .insert({ user_id: user.id, product_slug: slug });

  // 23505 = unique_violation → already wishlisted, so remove it.
  if (insertErr && (insertErr as { code?: string }).code === "23505") {
    const { error: delErr } = await sb
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("product_slug", slug);
    if (delErr) throw new Error(delErr.message);
  } else if (insertErr) {
    throw new Error(insertErr.message);
  }

  revalidatePath("/account/wishlist");
  revalidatePath(`/products/${slug}`);
}

export async function removeFromWishlist(slug: string): Promise<void> {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("wishlist").delete().eq("user_id", user.id).eq("product_slug", slug);
  revalidatePath("/account/wishlist");
  revalidatePath(`/products/${slug}`);
}
