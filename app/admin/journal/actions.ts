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

const get = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function parsePayload(fd: FormData) {
  const slug = get(fd, "slug").toLowerCase();
  const title = get(fd, "title");
  const eyebrow = get(fd, "eyebrow") || null;
  const excerpt = get(fd, "excerpt") || null;
  const body = get(fd, "body");
  const heroImage = get(fd, "hero_image");
  const brand = get(fd, "brand") || null;
  const published = fd.get("published") === "on";

  const errors: string[] = [];
  if (!slug.match(/^[a-z0-9][a-z0-9-]+$/)) errors.push("Slug must be lowercase letters, numbers and hyphens.");
  if (!title) errors.push("Title is required.");
  if (!body) errors.push("Body is required.");
  if (!heroImage) errors.push("Hero image URL is required.");
  if (errors.length) throw new Error(errors.join(" "));

  return { slug, title, eyebrow, excerpt, body, hero_image: heroImage, brand, published };
}

export async function createJournalPost(formData: FormData) {
  await requireAdmin();
  const p = parsePayload(formData);
  const sb = getAdminSupabase();
  const { error } = await sb.from("journal_posts").insert({
    ...p,
    published_at: p.published ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/editorial");
  revalidatePath("/admin/journal");
  revalidatePath("/", "layout");
  redirect("/admin/journal");
}

export async function updateJournalPost(originalSlug: string, formData: FormData) {
  await requireAdmin();
  const p = parsePayload(formData);
  const sb = getAdminSupabase();

  // If toggling published on for the first time, set published_at.
  const { data: existing } = await sb
    .from("journal_posts")
    .select("published, published_at")
    .eq("slug", originalSlug)
    .maybeSingle();
  const publishedAt =
    p.published && !existing?.published_at
      ? new Date().toISOString()
      : existing?.published_at ?? null;

  const { error } = await sb
    .from("journal_posts")
    .update({
      ...p,
      published_at: p.published ? publishedAt : null,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", originalSlug);
  if (error) throw new Error(error.message);

  revalidatePath("/editorial");
  revalidatePath(`/editorial/${originalSlug}`);
  if (p.slug !== originalSlug) revalidatePath(`/editorial/${p.slug}`);
  revalidatePath("/admin/journal");
  revalidatePath("/", "layout");
  redirect("/admin/journal");
}

export async function deleteJournalPost(slug: string) {
  await requireAdmin();
  const sb = getAdminSupabase();
  const { error } = await sb.from("journal_posts").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
  revalidatePath("/editorial");
  revalidatePath("/admin/journal");
  revalidatePath("/", "layout");
}
