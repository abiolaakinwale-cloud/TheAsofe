import { getAdminSupabase } from "@/lib/supabase/admin";

export type SellerRecap = {
  brand: string;
  brandName: string;
  periodStart: string;
  periodEnd: string;
  delivered_orders: number;
  pieces_sold: number;
  gross_pence: number;          // sum of unit_price * qty (in pence — convert from existing GBP-as-pounds storage by ×100)
  top_piece: { slug: string; name: string; units: number } | null;
  top_wishlisted: { slug: string; name: string; count: number } | null;
  new_reviews: number;
  new_review_avg: number;       // 0 when none
  pending_questions: number;
  pending_payout_pence: number; // running outstanding net for the upcoming statement
};

export async function buildSellerRecap(brandSlug: string, periodStartISO: string, periodEndISO: string): Promise<SellerRecap | null> {
  const sb = getAdminSupabase();

  const { data: brand } = await sb
    .from("brands")
    .select("slug, name, commission_rate")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) return null;

  const fromTs = `${periodStartISO}T00:00:00Z`;
  const toTs   = `${periodEndISO}T23:59:59.999Z`;

  // 1. Delivered orders in window
  const { data: orders } = await sb
    .from("orders")
    .select("id, total, currency, delivered_at, updated_at")
    .eq("status", "delivered")
    .gte("updated_at", fromTs)
    .lte("updated_at", toTs);
  const orderIds = (orders ?? []).map(o => o.id);

  // 2. This brand's line items on those orders
  const { data: items } = orderIds.length
    ? await sb.from("order_items")
        .select("product_slug, name, qty, unit_price, order_id")
        .eq("brand_slug", brandSlug)
        .in("order_id", orderIds)
    : { data: [] };

  // 3. Aggregate by piece for top-seller, plus totals
  let pieces_sold = 0;
  let gross_pence = 0;
  const byPiece = new Map<string, { name: string; units: number }>();
  for (const it of items ?? []) {
    pieces_sold += it.qty;
    gross_pence += it.unit_price * it.qty * 100;   // unit_price is GBP pounds → pence
    const cur = byPiece.get(it.product_slug) ?? { name: it.name, units: 0 };
    cur.units += it.qty;
    byPiece.set(it.product_slug, cur);
  }
  const orderIdsTouched = new Set((items ?? []).map(i => i.order_id));
  const delivered_orders = orderIdsTouched.size;

  const top_piece_entry = Array.from(byPiece.entries()).sort((a, b) => b[1].units - a[1].units)[0];
  const top_piece = top_piece_entry
    ? { slug: top_piece_entry[0], name: top_piece_entry[1].name, units: top_piece_entry[1].units }
    : null;

  // 4. Top-wishlisted piece in this brand within the window (a demand signal)
  const { data: brandProducts } = await sb.from("products").select("slug, name").eq("brand", brandSlug);
  const productNameBySlug = new Map((brandProducts ?? []).map(p => [p.slug, p.name]));
  const ownedSlugs = Array.from(productNameBySlug.keys());

  const { data: wishRows } = ownedSlugs.length
    ? await sb.from("wishlist")
        .select("product_slug")
        .in("product_slug", ownedSlugs)
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
    : { data: [] };
  const wishCount = new Map<string, number>();
  for (const w of wishRows ?? []) {
    wishCount.set(w.product_slug, (wishCount.get(w.product_slug) ?? 0) + 1);
  }
  const top_wish_entry = Array.from(wishCount.entries()).sort((a, b) => b[1] - a[1])[0];
  const top_wishlisted = top_wish_entry
    ? { slug: top_wish_entry[0], name: productNameBySlug.get(top_wish_entry[0]) ?? top_wish_entry[0], count: top_wish_entry[1] }
    : null;

  // 5. Reviews landed in window
  const { data: reviews } = await sb
    .from("reviews")
    .select("rating, created_at")
    .eq("brand_slug", brandSlug)
    .eq("status", "published")
    .gte("created_at", fromTs)
    .lte("created_at", toTs);
  const new_reviews = reviews?.length ?? 0;
  const new_review_avg = new_reviews > 0
    ? Math.round(((reviews ?? []).reduce((s, r) => s + r.rating, 0) / new_reviews) * 10) / 10
    : 0;

  // 6. Pending Q&A for this brand
  const { count: pending_questions } = await sb
    .from("designer_questions")
    .select("id", { count: "exact", head: true })
    .eq("brand_slug", brandSlug)
    .eq("status", "pending");

  // 7. Pending payout: same calc the /admin/payouts/new flow would do for the
  //    upcoming month, capped by commission rate
  const commission = Number(brand.commission_rate ?? 0.30);
  const pending_payout_pence = Math.round(gross_pence * (1 - commission));

  return {
    brand: brand.slug,
    brandName: brand.name,
    periodStart: periodStartISO,
    periodEnd: periodEndISO,
    delivered_orders,
    pieces_sold,
    gross_pence,
    top_piece,
    top_wishlisted,
    new_reviews,
    new_review_avg,
    pending_questions: pending_questions ?? 0,
    pending_payout_pence,
  };
}
