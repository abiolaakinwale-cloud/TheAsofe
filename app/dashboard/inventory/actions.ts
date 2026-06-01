"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { logAction } from "@/lib/audit";

async function getSellerContext() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("No profile.");
  if (profile.role !== "seller" && profile.role !== "admin") throw new Error("Sellers only.");
  return { role: profile.role, brand: profile.brand as string | null };
}

/**
 * Update a single (slug, colour, size) stock row from the low-stock
 * dashboard. Quick-edit alternative to the full per-product stock matrix.
 */
export async function updateSingleStock(formData: FormData) {
  const { brand } = await getSellerContext();

  const slug   = String(formData.get("slug") || "").trim();
  const colour = String(formData.get("colour") || "");
  const size   = String(formData.get("size") || "").trim();
  const qtyRaw = formData.get("quantity");

  if (!slug || !size) throw new Error("Missing slug or size.");
  const qty = Number(qtyRaw);
  if (!Number.isFinite(qty) || qty < 0) throw new Error("Quantity must be a non-negative number.");

  const admin = getAdminSupabase();

  // Ownership: only mutate stock for products on the seller's own brand
  const { data: product } = await admin.from("products").select("brand").eq("slug", slug).maybeSingle();
  if (!product) throw new Error("Product not found.");
  if (brand && product.brand !== brand) throw new Error("Not your product.");

  const { data: before } = await admin
    .from("stock_levels")
    .select("quantity")
    .eq("product_slug", slug)
    .eq("colour", colour)
    .eq("size", size)
    .maybeSingle();

  const { error } = await admin
    .from("stock_levels")
    .upsert(
      { product_slug: slug, colour, size, quantity: Math.floor(qty), updated_at: new Date().toISOString() },
      { onConflict: "product_slug,colour,size" }
    );
  if (error) throw new Error(error.message);

  await logAction({
    action: "stock.adjusted",
    targetType: "product",
    targetId: slug,
    metadata: { colour, size, from: before?.quantity ?? null, to: Math.floor(qty) },
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/products/${slug}/edit`);
  revalidatePath(`/products/${slug}`);
}
