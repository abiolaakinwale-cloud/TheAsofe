"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyApplicationSubmitted } from "@/lib/notifications";

export type BrandApplicationInput = {
  // Contact
  email: string;
  // Brand
  brandName: string;
  founderName: string;
  instagramHandle: string;
  productCategory: string;
  monthlyInventoryEstimate: string;
  whatsappNumber: string;
  website?: string;
};

export type ApplicationResult =
  | { ok: true }
  | { ok: false; error: string };

const requiredFields = [
  "brandName",
  "founderName",
  "instagramHandle",
  "productCategory",
  "monthlyInventoryEstimate",
  "whatsappNumber",
] as const;

/**
 * Express interest as a brand — no account creation required.
 * Credentials are provisioned at acceptance time via the admin "Approve"
 * action, which calls scripts/admin-set-password.mjs and emails the
 * founder a one-shot password.
 *
 * Marketplace funnel logic: forcing account creation on the highest-value
 * funnel adds 30 seconds of friction that loses ~25% of completions on
 * typical luxury verticals. Brands have nothing to log in *for* until
 * they're accepted, so the gate is wrong.
 */
export async function submitBrandApplication(input: BrandApplicationInput): Promise<ApplicationResult> {
  if (!input.email?.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  for (const k of requiredFields) {
    if (!input[k]?.trim()) {
      return { ok: false, error: `Please fill in your ${humanise(k)}.` };
    }
  }

  const email = input.email.trim().toLowerCase();
  const admin = getAdminSupabase();

  // Duplicate guard: same email + brand within the last 30 days
  const { data: recent } = await admin
    .from("applications")
    .select("id")
    .eq("applicant_email", email)
    .eq("brand_name", input.brandName.trim())
    .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
    .maybeSingle();
  if (recent) {
    return { ok: false, error: "We've already received an application for this brand from this email in the last 30 days — we'll be in touch shortly." };
  }

  const { data: app, error: appErr } = await admin
    .from("applications")
    .insert({
      brand_name: input.brandName.trim(),
      founder_name: input.founderName.trim(),
      instagram_handle: input.instagramHandle.trim(),
      product_category: input.productCategory.trim(),
      monthly_inventory_estimate: input.monthlyInventoryEstimate.trim(),
      whatsapp_number: input.whatsappNumber.trim(),
      website: input.website?.trim() || null,
      applicant_user_id: null,
      applicant_email: email,
    })
    .select("id")
    .single();

  if (appErr) {
    console.error("application insert failed", appErr);
    return { ok: false, error: "Couldn't submit your application. Write to correspondence@theasofe.com and we'll receive it directly." };
  }

  await notifyApplicationSubmitted({
    id: app.id,
    brand_name: input.brandName.trim(),
    founder_name: input.founderName.trim(),
    instagram_handle: input.instagramHandle.trim(),
    product_category: input.productCategory.trim(),
    monthly_inventory_estimate: input.monthlyInventoryEstimate.trim(),
    whatsapp_number: input.whatsappNumber.trim(),
    website: input.website?.trim() || null,
  });

  return { ok: true };
}

function humanise(k: string) {
  return k.replace(/([A-Z])/g, " $1").toLowerCase().trim();
}
