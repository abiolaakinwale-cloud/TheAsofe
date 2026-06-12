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

export async function setCustomerStatus(
  id: string,
  status: "approved" | "rejected" | "pending",
) {
  await requireAdmin();
  const sb = getAdminSupabase();
  const { error } = await sb
    .from("profiles")
    .update({ customer_status: status })
    .eq("id", id)
    .eq("role", "visitor");
  if (error) throw error;
  revalidatePath("/admin/customers");
  revalidatePath("/admin");
}
