import { getAnonSupabase } from "@/lib/supabase/anon";

export type PublicQuestion = {
  id: string;
  question: string;
  answer: string;
  customer_name: string | null;
  created_at: string;
  answered_at: string | null;
};

/**
 * Fetch the publicly answered Q&A thread for a product, newest first.
 * Anon RLS only returns status='answered', so unanswered + hidden never
 * leak into this list.
 */
export async function getProductQuestions(productSlug: string, limit = 20): Promise<PublicQuestion[]> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("designer_questions")
    .select("id, question, answer, customer_name, created_at, answered_at")
    .eq("product_slug", productSlug)
    .eq("status", "answered")
    .order("answered_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PublicQuestion[];
}
