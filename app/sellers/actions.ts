"use server";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyApplicationSubmitted } from "@/lib/notifications";

export type ApplicationInput = {
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

const required = [
  "brandName",
  "founderName",
  "instagramHandle",
  "productCategory",
  "monthlyInventoryEstimate",
  "whatsappNumber",
] as const;

export async function submitApplication(input: ApplicationInput): Promise<ApplicationResult> {
  for (const k of required) {
    if (!input[k]?.trim()) {
      return { ok: false, error: `Please fill in your ${humanise(k)}.` };
    }
  }

  // Service-role client: the visitor is unauthenticated and we've already
  // validated input above. Bypassing RLS on this single insert path lets us
  // accept applications without exposing the table to public inserts.
  const sb = getAdminSupabase();
  const { data, error } = await sb
    .from("applications")
    .insert({
      brand_name: input.brandName.trim(),
      founder_name: input.founderName.trim(),
      instagram_handle: input.instagramHandle.trim(),
      product_category: input.productCategory.trim(),
      monthly_inventory_estimate: input.monthlyInventoryEstimate.trim(),
      whatsapp_number: input.whatsappNumber.trim(),
      website: input.website?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("application insert failed", error);
    return { ok: false, error: "We couldn't record your application. Please try again." };
  }

  await notifyApplicationSubmitted({
    id: data.id,
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
