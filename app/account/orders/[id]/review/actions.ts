"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export type SubmitReviewInput = {
  orderId: string;
  productSlug: string;
  rating: number;
  title?: string;
  body?: string;
  displayName?: string;
};

export type SubmitReviewResult = { ok: true; reviewId: string } | { ok: false; error: string };

export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to leave a review." };

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Pick a rating between 1 and 5 stars." };
  }

  // Verify the order is owned + delivered + contains this product
  const { data: order } = await sb
    .from("orders")
    .select("id, customer_id, status")
    .eq("id", input.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (order.customer_id !== user.id) return { ok: false, error: "Not your order." };
  if (order.status !== "delivered") return { ok: false, error: "Reviews open once your order is delivered." };

  const admin = getAdminSupabase();
  const { data: item } = await admin
    .from("order_items")
    .select("id, product_slug, brand_slug")
    .eq("order_id", input.orderId)
    .eq("product_slug", input.productSlug)
    .maybeSingle();
  if (!item) return { ok: false, error: "That piece isn't on this order." };

  const displayName = (input.displayName || user.email?.split("@")[0] || "Anonymous").trim().slice(0, 60);

  const { data: created, error } = await sb
    .from("reviews")
    .insert({
      customer_id: user.id,
      product_slug: input.productSlug,
      brand_slug: item.brand_slug,
      order_id: input.orderId,
      rating: input.rating,
      title: input.title?.trim() || null,
      body: input.body?.trim() || null,
      customer_name: displayName,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: "You've already reviewed this piece for this order." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/products/${input.productSlug}`);
  revalidatePath(`/brands/${item.brand_slug}`);
  revalidatePath(`/account/orders/${input.orderId}`);
  return { ok: true, reviewId: created.id };
}

export async function submitReviewForm(formData: FormData) {
  const orderId     = String(formData.get("orderId") || "");
  const productSlug = String(formData.get("productSlug") || "");
  const rating      = Number(formData.get("rating") || 0);
  const title       = String(formData.get("title") || "").trim() || undefined;
  const body        = String(formData.get("body") || "").trim() || undefined;
  const displayName = String(formData.get("displayName") || "").trim() || undefined;

  const r = await submitReview({ orderId, productSlug, rating, title, body, displayName });
  if (r.ok) redirect(`/account/orders/${orderId}?reviewed=${productSlug}`);
  redirect(`/account/orders/${orderId}/review?product=${productSlug}&error=${encodeURIComponent(r.error)}`);
}
