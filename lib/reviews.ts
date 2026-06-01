import { getAnonSupabase } from "@/lib/supabase/anon";

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  customer_name: string | null;
  created_at: string;
};

export type Aggregate = {
  count: number;
  average: number;       // 0–5 with one decimal
  distribution: number[]; // [count of 1-star, 2-star, 3-star, 4-star, 5-star]
};

const EMPTY_AGGREGATE: Aggregate = { count: 0, average: 0, distribution: [0, 0, 0, 0, 0] };

export async function getProductReviews(productSlug: string, limit = 20): Promise<Review[]> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("reviews")
    .select("id, rating, title, body, customer_name, created_at")
    .eq("product_slug", productSlug)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Review[];
}

export async function getProductAggregate(productSlug: string): Promise<Aggregate> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("reviews")
    .select("rating")
    .eq("product_slug", productSlug)
    .eq("status", "published");
  return aggregate(data ?? []);
}

export async function getBrandAggregate(brandSlug: string): Promise<Aggregate> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("reviews")
    .select("rating")
    .eq("brand_slug", brandSlug)
    .eq("status", "published");
  return aggregate(data ?? []);
}

function aggregate(rows: { rating: number }[]): Aggregate {
  if (rows.length === 0) return EMPTY_AGGREGATE;
  const dist = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const r of rows) {
    if (r.rating >= 1 && r.rating <= 5) {
      dist[r.rating - 1]++;
      sum += r.rating;
    }
  }
  return {
    count: rows.length,
    average: Math.round((sum / rows.length) * 10) / 10,
    distribution: dist,
  };
}
