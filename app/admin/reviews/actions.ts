"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { logAction } from "@/lib/audit";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin only.");
}

export async function setReviewStatus(id: string, status: "published" | "hidden") {
  await requireAdmin();
  const admin = getAdminSupabase();
  const { data: before } = await admin.from("reviews").select("status, product_slug, brand_slug").eq("id", id).maybeSingle();
  if (!before) throw new Error("Review not found.");

  const { error } = await admin
    .from("reviews")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logAction({
    action: status === "published" ? "review.published" : "review.hidden",
    targetType: "review",
    targetId: id,
    metadata: { previous_status: before.status, product: before.product_slug },
  });

  revalidatePath("/admin/reviews");
  revalidatePath(`/products/${before.product_slug}`);
  revalidatePath(`/brands/${before.brand_slug}`);
}
