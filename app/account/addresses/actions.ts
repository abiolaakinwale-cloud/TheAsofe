"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";

export async function addAddress(formData: FormData) {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const payload = {
    customer_id: user.id,
    full_name: String(formData.get("full_name") || "").trim(),
    line1:     String(formData.get("line1")     || "").trim(),
    line2:     String(formData.get("line2")     || "").trim() || null,
    city:      String(formData.get("city")      || "").trim(),
    postcode:  String(formData.get("postcode")  || "").trim(),
    country:   String(formData.get("country")   || "United Kingdom").trim(),
    phone:     String(formData.get("phone")     || "").trim() || null,
  };

  const errors: string[] = [];
  if (!payload.full_name) errors.push("Full name is required.");
  if (!payload.line1)     errors.push("Address line 1 is required.");
  if (!payload.city)      errors.push("City is required.");
  if (!payload.postcode)  errors.push("Postcode is required.");
  if (!payload.country)   errors.push("Country is required.");
  if (errors.length) throw new Error(errors.join(" "));

  const { error } = await sb.from("addresses").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/account/addresses");
}

export async function removeAddress(id: string) {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // RLS already restricts to own rows, but pass customer_id for clarity.
  const { error } = await sb.from("addresses").delete().eq("id", id).eq("customer_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/account/addresses");
}
