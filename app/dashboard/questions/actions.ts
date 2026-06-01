"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyQuestionAnswered } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

async function requireSellerForBrand() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("No profile.");
  if (profile.role === "admin") return { userId: user.id, brand: profile.brand };
  if (profile.role !== "seller" || !profile.brand) throw new Error("Seller role + brand required.");
  return { userId: user.id, brand: profile.brand };
}

export async function answerQuestion(formData: FormData) {
  const { userId, brand } = await requireSellerForBrand();
  const id     = String(formData.get("id") || "");
  const answer = String(formData.get("answer") || "").trim();
  if (!id || !answer) throw new Error("Missing question id or answer.");
  if (answer.length < 4)  throw new Error("Reply seems too short.");
  if (answer.length > 4000) throw new Error("Reply too long (4000 chars max).");

  const admin = getAdminSupabase();
  const { data: q } = await admin
    .from("designer_questions")
    .select("id, brand_slug, customer_id, product_slug, question, status")
    .eq("id", id)
    .maybeSingle();
  if (!q) throw new Error("Question not found.");
  if (brand && q.brand_slug !== brand) throw new Error("Not your brand's question.");
  if (q.status === "answered")  throw new Error("Already answered.");
  if (q.status === "hidden" || q.status === "flagged") throw new Error("Question is not available to answer.");

  const now = new Date().toISOString();
  const { error } = await admin
    .from("designer_questions")
    .update({
      answer,
      status: "answered",
      answered_by: userId,
      answered_at: now,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Notify customer
  const { data: customer } = await admin.from("profiles").select("email").eq("id", q.customer_id).maybeSingle();
  const { data: product }  = await admin.from("products").select("name").eq("slug", q.product_slug).maybeSingle();
  if (customer?.email && product?.name) {
    await notifyQuestionAnswered({
      customerEmail: customer.email,
      productName: product.name,
      productSlug: q.product_slug,
      question: q.question,
      answer,
    });
  }

  await logAction({
    action: "question.answered",
    targetType: "question",
    targetId: id,
    metadata: { brand: q.brand_slug, product: q.product_slug },
  });

  revalidatePath("/dashboard/questions");
  revalidatePath(`/products/${q.product_slug}`);
}
