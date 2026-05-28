"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { parseCsvKeyed } from "@/lib/csv";

export type RowResult =
  | { row: number; slug: string; status: "ok" }
  | { row: number; slug: string; status: "error"; error: string };

export type ImportResult = {
  ok: boolean;
  total: number;
  inserted: number;
  failed: number;
  results: RowResult[];
};

const REQUIRED = ["slug", "name", "category", "price", "colour", "made_in", "description", "sizes", "composition", "images"] as const;
const SLUG_RE = /^[a-z0-9][a-z0-9-]+$/;

function asBool(v: string | undefined): boolean {
  if (!v) return false;
  const x = v.trim().toLowerCase();
  return x === "true" || x === "1" || x === "yes" || x === "y" || x === "on";
}

function splitList(v: string | undefined, sep: RegExp): string[] {
  if (!v) return [];
  return v.split(sep).map(s => s.trim()).filter(Boolean);
}

export async function importProducts(formData: FormData): Promise<ImportResult> {
  // 1. Auth
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("No profile.");
  if (profile.role !== "seller" && profile.role !== "admin") throw new Error("Sellers only.");
  if (!profile.brand) throw new Error("Your account is not assigned to a brand yet.");
  const brand = profile.brand;

  // 2. Parse CSV
  const csv = String(formData.get("csv") || "").trim();
  if (!csv) return { ok: false, total: 0, inserted: 0, failed: 0, results: [] };
  const { headers, rows } = parseCsvKeyed(csv);

  const missing = REQUIRED.filter(h => !headers.includes(h));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}. Expected: ${REQUIRED.join(", ")}.`);
  }

  // 3. Validate each row; collect valid payloads + errors
  const admin = getAdminSupabase();
  const results: RowResult[] = [];
  const payloads: object[] = [];
  const seenSlugs = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // accounting for header row → user-visible row number
    const slug = (r.slug || "").trim().toLowerCase();
    const errors: string[] = [];

    if (!SLUG_RE.test(slug)) errors.push("Slug must be lowercase letters/numbers/hyphens.");
    if (seenSlugs.has(slug)) errors.push("Duplicate slug within this CSV.");
    if (!r.name) errors.push("Name is required.");
    if (!r.category) errors.push("Category is required.");
    if (!r.colour) errors.push("Colour is required.");
    if (!r.made_in) errors.push("Made in is required.");
    if (!r.description) errors.push("Description is required.");
    const sizes = splitList(r.sizes, /[,;|]/);
    if (sizes.length === 0) errors.push("At least one size is required.");
    const composition = splitList(r.composition, /[,;]/);
    if (composition.length === 0) errors.push("Composition is required.");
    const images = splitList(r.images, /[\s|]/);
    if (images.length === 0) errors.push("At least one image URL is required.");
    const price = Number(r.price);
    if (!Number.isFinite(price) || price < 0) errors.push("Price must be a non-negative number.");

    if (errors.length) {
      results.push({ row: rowNum, slug, status: "error", error: errors.join(" ") });
      continue;
    }

    seenSlugs.add(slug);
    payloads.push({
      slug,
      name: r.name,
      category: r.category.trim().toLowerCase(),
      subcategory: r.subcategory?.trim() || null,
      price: Math.round(price),
      description: r.description,
      composition,
      made_in: r.made_in,
      sizes,
      colour: r.colour,
      images,
      published:   asBool(r.published),
      new_arrival: asBool(r.new_arrival),
      featured:    asBool(r.featured),
      brand,
      seller: `${brand}-direct`,
      currency: "GBP",
    });
  }

  // 4. Insert valid rows one-at-a-time so a single bad row doesn't kill the batch
  let inserted = 0;
  for (let j = 0; j < payloads.length; j++) {
    const p = payloads[j] as { slug: string };
    const { error } = await admin.from("products").insert(p);
    if (error) {
      // Find the original row to update its result
      const existing = results.find(r => r.slug === p.slug && r.status === "ok");
      if (existing) (existing as RowResult).status = "error";
      results.push({
        row: -1,
        slug: p.slug,
        status: "error",
        error: error.code === "23505" ? `Slug "${p.slug}" already exists.` : error.message,
      });
    } else {
      inserted++;
      results.push({ row: -1, slug: p.slug, status: "ok" });
    }
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/");
  revalidatePath(`/brands/${brand}`);

  return {
    ok: inserted > 0,
    total: rows.length,
    inserted,
    failed: results.filter(r => r.status === "error").length,
    results,
  };
}
