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

export async function setQuestionStatus(id: string, status: "pending" | "answered" | "hidden" | "flagged") {
  await requireAdmin();
  const admin = getAdminSupabase();
  const { data: before } = await admin
    .from("designer_questions")
    .select("status, product_slug, brand_slug")
    .eq("id", id)
    .maybeSingle();
  if (!before) throw new Error("Question not found.");
  if (before.status === status) return; // no-op

  await admin
    .from("designer_questions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  await logAction({
    action:
      status === "hidden"   ? "question.hidden"   :
      status === "flagged"  ? "question.flagged"  :
      status === "answered" ? "question.restored" :
      "question.unhidden",
    targetType: "question",
    targetId: id,
    metadata: { previous_status: before.status, brand: before.brand_slug, product: before.product_slug },
  });

  revalidatePath("/admin/questions");
  revalidatePath(`/products/${before.product_slug}`);
}
