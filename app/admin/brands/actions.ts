"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin role required.");
}

export async function createBrand(formData: FormData) {
  await requireAdmin();

  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const tagline = String(formData.get("tagline") || "").trim();
  const founded = String(formData.get("founded") || "").trim();
  const origin = String(formData.get("origin") || "").trim();
  const story = String(formData.get("story") || "").trim();
  const heroImage = String(formData.get("hero_image") || "").trim();

  if (!slug.match(/^[a-z0-9][a-z0-9-]+$/)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens.");
  }
  if (!name || !tagline || !origin || !story || !heroImage) {
    throw new Error("All fields except 'founded' are required.");
  }

  const sb = getAdminSupabase();
  const { error } = await sb.from("brands").insert({
    slug, name, tagline, founded: founded || "—", origin, story, hero_image: heroImage,
  });
  if (error) throw new Error(error.message);

  // Sellers row matching the brand (1:1 for now)
  await sb.from("sellers").insert({
    slug: `${slug}-direct`,
    name,
    type: "Atelier",
    location: origin,
  });

  revalidatePath("/admin/brands");
  revalidatePath("/admin");
  redirect("/admin/brands");
}
