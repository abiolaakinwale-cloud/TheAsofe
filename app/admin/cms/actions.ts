"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { SiteSettings } from "@/lib/cms";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin role required.");
  return user.id;
}

const get = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function updateSiteSettings(formData: FormData) {
  const adminId = await requireAdmin();

  const data: SiteSettings = {
    hero: {
      eyebrow:       get(formData, "hero.eyebrow"),
      title:         get(formData, "hero.title"),
      body:          get(formData, "hero.body"),
      image:         get(formData, "hero.image"),
      primaryLabel:  get(formData, "hero.primaryLabel"),
      primaryHref:   get(formData, "hero.primaryHref"),
      secondaryLabel:get(formData, "hero.secondaryLabel"),
      secondaryHref: get(formData, "hero.secondaryHref"),
    },
    journal: {
      eyebrow: get(formData, "journal.eyebrow"),
      title:   get(formData, "journal.title"),
      body:    get(formData, "journal.body"),
      image:   get(formData, "journal.image"),
      label:   get(formData, "journal.label"),
      href:    get(formData, "journal.href"),
    },
    concierge: {
      eyebrow: get(formData, "concierge.eyebrow"),
      title:   get(formData, "concierge.title"),
      body:    get(formData, "concierge.body"),
      label:   get(formData, "concierge.label"),
      href:    get(formData, "concierge.href"),
    },
    images: {
      sellersBand:      get(formData, "images.sellersBand"),
      sellersHero:      get(formData, "images.sellersHero"),
      conciergeFeature: get(formData, "images.conciergeFeature"),
      stockistsFeature: get(formData, "images.stockistsFeature"),
      signinSide:       get(formData, "images.signinSide"),
    },
    spotlight: {
      enabled:          formData.get("spotlight.enabled") === "on",
      brandSlug:        get(formData, "spotlight.brandSlug"),
      eyebrow:          get(formData, "spotlight.eyebrow"),
      editorialImage:   get(formData, "spotlight.editorialImage"),
      quote:            get(formData, "spotlight.quote"),
      quoteAttribution: get(formData, "spotlight.quoteAttribution"),
    },
  };

  const sb = getAdminSupabase();
  const { error } = await sb
    .from("site_settings")
    .upsert({ id: 1, data, updated_at: new Date().toISOString(), updated_by: adminId }, { onConflict: "id" });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout"); // Homepage reads from settings; refresh everywhere.
  redirect("/admin/cms?saved=1");
}
