"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { parseCsvKeyed } from "@/lib/csv";

export type StockRowResult =
  | { row: number; slug: string; size: string; quantity: number; status: "ok" }
  | { row: number; slug: string; size: string; status: "error"; error: string };

export type StockImportResult = {
  ok: boolean;
  total: number;
  updated: number;
  failed: number;
  results: StockRowResult[];
};

const REQUIRED = ["slug", "size", "quantity"] as const;

export async function importStock(formData: FormData): Promise<StockImportResult> {
  // 1. Auth — seller or admin only
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("No profile.");
  if (profile.role !== "seller" && profile.role !== "admin") throw new Error("Sellers only.");
  if (profile.role === "seller" && !profile.brand) throw new Error("Your account is not assigned to a brand yet.");

  // 2. Parse CSV
  const csv = String(formData.get("csv") || "").trim();
  if (!csv) return { ok: false, total: 0, updated: 0, failed: 0, results: [] };
  const { headers, rows } = parseCsvKeyed(csv);

  const missing = REQUIRED.filter(h => !headers.includes(h));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}. Expected: ${REQUIRED.join(", ")}.`);
  }

  // 3. Load this seller's products (or all if admin) so we can verify slug
  //    ownership AND that the size exists on the product.
  const admin = getAdminSupabase();
  const query = admin.from("products").select("slug, brand, sizes");
  const { data: products, error: productsErr } = profile.brand
    ? await query.eq("brand", profile.brand)
    : await query;
  if (productsErr) throw productsErr;
  const productBySlug = new Map<string, { brand: string; sizes: string[] }>(
    (products ?? []).map(p => [p.slug, { brand: p.brand, sizes: p.sizes as string[] }])
  );

  // 4. Validate rows
  const results: StockRowResult[] = [];
  type Payload = { product_slug: string; size: string; quantity: number };
  const payloads: Payload[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2;
    const slug = (r.slug || "").trim().toLowerCase();
    const size = (r.size || "").trim();
    const quantityStr = (r.quantity || "").trim();
    const quantity = Number(quantityStr);

    const errors: string[] = [];
    if (!slug) errors.push("Slug is required.");
    if (!size) errors.push("Size is required.");
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      errors.push("Quantity must be a non-negative integer.");
    }

    const product = productBySlug.get(slug);
    if (slug && !product) {
      errors.push(profile.brand
        ? `Slug "${slug}" not found in your collection.`
        : `Slug "${slug}" not found.`);
    } else if (product && size && !product.sizes.includes(size)) {
      errors.push(`Size "${size}" isn't defined on "${slug}" (defined: ${product.sizes.join(", ")}).`);
    }

    if (errors.length) {
      results.push({ row: rowNum, slug, size, status: "error", error: errors.join(" ") });
      continue;
    }
    payloads.push({ product_slug: slug, size, quantity });
  }

  // 5. Upsert valid rows one at a time so a bad row doesn't kill the batch
  let updated = 0;
  for (const p of payloads) {
    const { error } = await admin
      .from("stock_levels")
      .upsert(
        { ...p, updated_at: new Date().toISOString() },
        { onConflict: "product_slug,size" }
      );
    if (error) {
      results.push({ row: -1, slug: p.product_slug, size: p.size, status: "error", error: error.message });
    } else {
      updated++;
      results.push({ row: -1, slug: p.product_slug, size: p.size, quantity: p.quantity, status: "ok" });
    }
  }

  revalidatePath("/dashboard/products");
  // Revalidate every affected product detail page so "sold out" badges update.
  const touched = new Set(payloads.map(p => p.product_slug));
  for (const slug of touched) {
    revalidatePath(`/products/${slug}`);
  }

  return {
    ok: updated > 0,
    total: rows.length,
    updated,
    failed: results.filter(r => r.status === "error").length,
    results,
  };
}
