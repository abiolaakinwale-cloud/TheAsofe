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
}

export async function updateProfile(id: string, formData: FormData) {
  await requireAdmin();
  const role = String(formData.get("role") || "visitor") as "visitor" | "seller" | "admin";
  const brand = String(formData.get("brand") || "") || null;

  if (!["visitor", "seller", "admin"].includes(role)) {
    throw new Error("Invalid role.");
  }
  if (role !== "seller" && brand) {
    throw new Error("Only sellers can be assigned to a brand.");
  }

  const sb = getAdminSupabase();
  const { error } = await sb.from("profiles").update({ role, brand }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
