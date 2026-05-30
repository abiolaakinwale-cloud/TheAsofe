"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

async function getSellerContext() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("No profile.");
  if (profile.role !== "seller" && profile.role !== "admin") throw new Error("Sellers only.");
  return { role: profile.role, brand: profile.brand };
}

function parsePayload(formData: FormData, brand: string | null) {
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const subcategory = String(formData.get("subcategory") || "").trim() || null;
  const priceStr = String(formData.get("price") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const colour = String(formData.get("colour") || "").trim();
  const madeIn = String(formData.get("made_in") || "").trim();
  const sizes = String(formData.get("sizes") || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const coloursList = String(formData.get("colours") || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const composition = String(formData.get("composition") || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const images = String(formData.get("images") || "")
    .split(/\s|\n/).map(s => s.trim()).filter(Boolean);
  const published = formData.get("published") === "on";
  const newArrival = formData.get("new_arrival") === "on";
  const featured = formData.get("featured") === "on";
  const madeToOrder = formData.get("made_to_order") === "on";
  const leadTimeRaw = String(formData.get("lead_time_weeks") || "").trim();
  const leadTimeWeeks = leadTimeRaw === "" ? null : Number(leadTimeRaw);

  const errors: string[] = [];
  if (!slug.match(/^[a-z0-9][a-z0-9-]+$/)) errors.push("Slug must be lowercase letters, numbers, and hyphens.");
  if (!name) errors.push("Name is required.");
  if (!category) errors.push("Category is required.");
  if (!description) errors.push("Description is required.");
  if (!colour) errors.push("Colour is required.");
  if (!madeIn) errors.push("Made in is required.");
  if (sizes.length === 0) errors.push("At least one size is required.");
  if (composition.length === 0) errors.push("Composition is required.");
  if (images.length === 0) errors.push("At least one image URL is required.");
  const price = Number(priceStr);
  if (!Number.isFinite(price) || price < 0) errors.push("Price must be a non-negative number.");
  if (!brand) errors.push("Your account is not assigned to a brand yet.");
  if (madeToOrder && (leadTimeWeeks === null || !Number.isFinite(leadTimeWeeks) || leadTimeWeeks <= 0)) {
    errors.push("Lead time (weeks) is required when 'Made to order' is on.");
  }
  if (errors.length) throw new Error(errors.join(" "));

  return {
    slug, name, category, subcategory, price: Math.round(price),
    description, colour, made_in: madeIn, sizes, composition, images,
    published, new_arrival: newArrival, featured,
    made_to_order: madeToOrder,
    lead_time_weeks: madeToOrder ? Math.round(leadTimeWeeks!) : null,
    colours: coloursList.length > 0 ? coloursList : null,
    brand: brand!,
    seller: `${brand}-direct`,
    currency: "GBP" as const,
  };
}

export async function createProduct(formData: FormData) {
  const { brand } = await getSellerContext();
  const payload = parsePayload(formData, brand);

  // Use admin client to bypass RLS — we've validated ownership above.
  const sb = getAdminSupabase();
  const { error } = await sb.from("products").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/products");
  revalidatePath("/");
  revalidatePath(`/brands/${brand}`);
  redirect("/dashboard/products");
}

export async function updateProduct(originalSlug: string, formData: FormData) {
  const { brand } = await getSellerContext();
  const payload = parsePayload(formData, brand);

  // Ensure they own the original row
  const sb = getAdminSupabase();
  const { data: existing } = await sb.from("products").select("brand").eq("slug", originalSlug).maybeSingle();
  if (!existing) throw new Error("Product not found.");
  if (existing.brand !== brand) throw new Error("You can only edit your own products.");

  const { error } = await sb
    .from("products")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("slug", originalSlug);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/products");
  revalidatePath("/");
  revalidatePath(`/brands/${brand}`);
  revalidatePath(`/products/${payload.slug}`);
  if (payload.slug !== originalSlug) {
    revalidatePath(`/products/${originalSlug}`);
  }
  redirect("/dashboard/products");
}

export async function deleteProduct(slug: string) {
  const { brand } = await getSellerContext();
  const sb = getAdminSupabase();

  const { data: existing } = await sb.from("products").select("brand").eq("slug", slug).maybeSingle();
  if (!existing) return;
  if (existing.brand !== brand) throw new Error("You can only delete your own products.");

  const { error } = await sb.from("products").delete().eq("slug", slug);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/products");
  revalidatePath("/");
  revalidatePath(`/brands/${brand}`);
  revalidatePath(`/products/${slug}`);
}

export async function updateStock(productSlug: string, formData: FormData) {
  const { brand } = await getSellerContext();
  const sb = getAdminSupabase();

  const { data: product } = await sb
    .from("products")
    .select("brand, sizes, colour, colours")
    .eq("slug", productSlug)
    .maybeSingle();
  if (!product) throw new Error("Product not found.");
  if (product.brand !== brand) throw new Error("You can only manage stock for your own products.");

  // Variants: if colours[] is set, use it; otherwise treat as a single colour
  // matrix (using the default colour string, or "" for legacy single-colour rows).
  const variants: string[] =
    Array.isArray(product.colours) && product.colours.length > 0
      ? (product.colours as string[])
      : [product.colour ?? ""];

  const sizes = product.sizes as string[];
  const rows: { product_slug: string; colour: string; size: string; quantity: number; updated_at: string }[] = [];

  for (const colour of variants) {
    for (const size of sizes) {
      // Form field name: `stock__{colour}__{size}`. If a row's field is missing
      // (e.g. seller's form hasn't been re-rendered with the new colour), leave
      // the existing stock untouched by not including it in the upsert.
      const raw = formData.get(`stock__${colour}__${size}`);
      if (raw === null) continue;
      const qty = Number(raw);
      rows.push({
        product_slug: productSlug,
        colour,
        size,
        quantity: Number.isFinite(qty) && qty >= 0 ? Math.floor(qty) : 0,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (rows.length > 0) {
    const { error } = await sb
      .from("stock_levels")
      .upsert(rows, { onConflict: "product_slug,colour,size" });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/dashboard/products/${productSlug}/edit`);
  revalidatePath(`/products/${productSlug}`);
}
