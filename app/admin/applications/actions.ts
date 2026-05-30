"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin role required.");
  return user.id;
}

export async function setApplicationStatus(id: string, status: "approved" | "rejected" | "pending") {
  const adminId = await requireAdmin();
  const sb = getAdminSupabase();

  // Fetch the application so we can elevate the linked user when approving.
  const { data: app, error: fetchErr } = await sb
    .from("applications")
    .select("applicant_user_id")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  const { error } = await sb
    .from("applications")
    .update({
      status,
      reviewed_by: status === "pending" ? null : adminId,
      reviewed_at: status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;

  // On approval, lift the applicant's profile to 'seller' (brand assignment
  // still happens via /admin/brands + /admin/users). On revert to pending,
  // drop them back to 'visitor' if they aren't already a fully-set-up seller.
  if (app?.applicant_user_id) {
    if (status === "approved") {
      const { data: existing } = await sb
        .from("profiles")
        .select("role")
        .eq("id", app.applicant_user_id)
        .maybeSingle();
      if (existing && existing.role === "visitor") {
        await sb.from("profiles").update({ role: "seller" }).eq("id", app.applicant_user_id);
      }
    } else if (status === "pending") {
      const { data: existing } = await sb
        .from("profiles")
        .select("role, brand")
        .eq("id", app.applicant_user_id)
        .maybeSingle();
      // Only demote if no brand has been assigned yet.
      if (existing && existing.role === "seller" && !existing.brand) {
        await sb.from("profiles").update({ role: "visitor" }).eq("id", app.applicant_user_id);
      }
    }
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}
