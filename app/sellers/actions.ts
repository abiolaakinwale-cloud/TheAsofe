"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyApplicationSubmitted } from "@/lib/notifications";

export type BrandRegistrationInput = {
  // Account
  email: string;
  password: string;
  // Brand
  brandName: string;
  founderName: string;
  instagramHandle: string;
  productCategory: string;
  monthlyInventoryEstimate: string;
  whatsappNumber: string;
  website?: string;
};

export type RegistrationResult =
  | { ok: true }
  | { ok: false; error: string };

const requiredBrandFields = [
  "brandName",
  "founderName",
  "instagramHandle",
  "productCategory",
  "monthlyInventoryEstimate",
  "whatsappNumber",
] as const;

export async function registerAsBrand(input: BrandRegistrationInput): Promise<RegistrationResult> {
  // 1. Validate
  if (!input.email?.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  for (const k of requiredBrandFields) {
    if (!input[k]?.trim()) {
      return { ok: false, error: `Please fill in your ${humanise(k)}.` };
    }
  }

  const email = input.email.trim().toLowerCase();

  // 2. Create the auth account. signUp returns an existing-user error if the
  // email is already registered — surface that politely.
  const sb = await getServerSupabase();
  const { data: signupData, error: signupErr } = await sb.auth.signUp({
    email,
    password: input.password,
  });
  if (signupErr) {
    if (signupErr.message.toLowerCase().includes("already")) {
      return {
        ok: false,
        error: "An account with that email already exists. Log in at /brand-signin instead.",
      };
    }
    return { ok: false, error: signupErr.message };
  }
  const newUserId = signupData.user?.id ?? null;

  // 3. Insert the application linked to the new user. Use the service-role
  // client because RLS on `applications` only allows anonymous INSERT (which
  // would otherwise drop the applicant_user_id linkage).
  const admin = getAdminSupabase();
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
      applicant_user_id: newUserId,
      applicant_email: email,
    })
    .select("id")
    .single();

  if (appErr) {
    console.error("application insert failed", appErr);
    return { ok: false, error: "Your account was created but we couldn't record your application. Write to us at correspondence@theasofe.com so we can fix it." };
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
