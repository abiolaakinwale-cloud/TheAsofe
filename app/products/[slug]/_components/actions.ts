"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyDesignerQuestion } from "@/lib/notifications";

export async function askDesigner(formData: FormData) {
  const productSlug = String(formData.get("productSlug") || "").trim();
  const question    = String(formData.get("question") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim() || undefined;

  if (!productSlug || !question) redirect(`/products/${productSlug}?ask_error=missing`);
  if (question.length < 8)       redirect(`/products/${productSlug}?ask_error=too_short`);
  if (question.length > 1000)    redirect(`/products/${productSlug}?ask_error=too_long`);

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signin?next=/products/${productSlug}`);

  // Look up the product's brand so we can denormalise + notify the seller
  const admin = getAdminSupabase();
  const { data: product } = await admin
    .from("products")
    .select("slug, name, brand")
    .eq("slug", productSlug)
    .maybeSingle();
  if (!product) redirect(`/products/${productSlug}?ask_error=not_found`);

  const finalName = (displayName || user.email?.split("@")[0] || "Anonymous").slice(0, 60);

  const { error } = await sb.from("designer_questions").insert({
    product_slug: product.slug,
    brand_slug: product.brand,
    customer_id: user.id,
    customer_name: finalName,
    question,
  });
  if (error) redirect(`/products/${productSlug}?ask_error=${encodeURIComponent(error.message)}`);

  // Notify the seller
  const { data: seller } = await admin
    .from("profiles")
    .select("email")
    .eq("brand", product.brand)
    .eq("role", "seller")
    .maybeSingle();
  if (seller?.email) {
    await notifyDesignerQuestion({
      sellerEmail: seller.email,
      productName: product.name,
      productSlug: product.slug,
      customerName: finalName,
      question,
      brandSlug: product.brand,
    });
  }

  revalidatePath(`/products/${productSlug}`);
  redirect(`/products/${productSlug}?asked=1#questions`);
}
