import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { answerQuestion } from "./actions";

const STATUS_FILTERS = ["pending", "answered", "all"] as const;
type Filter = typeof STATUS_FILTERS[number];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export const metadata = { title: "Customer questions" };

export default async function DashboardQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: Filter = STATUS_FILTERS.includes(status as Filter) ? (status as Filter) : "pending";

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard/questions");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  // RLS scopes to current_brand() for sellers; admins see all
  let q = sb
    .from("designer_questions")
    .select("id, product_slug, customer_name, question, answer, status, created_at, answered_at, brand_slug")
    .order("created_at", { ascending: false });
  if (filter === "pending")  q = q.eq("status", "pending");
  if (filter === "answered") q = q.eq("status", "answered");
  const { data: rows } = await q;

  const countPending  = (await sb.from("designer_questions").select("id", { count: "exact", head: true }).eq("status", "pending")).count ?? 0;
  const countAnswered = (await sb.from("designer_questions").select("id", { count: "exact", head: true }).eq("status", "answered")).count ?? 0;

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Customer questions</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        {countPending} {countPending === 1 ? "question" : "questions"} awaiting reply.
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        Answers appear publicly on the product page once published. The customer is emailed automatically.
      </p>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/dashboard/questions?status=pending"  className="lux-link" style={{ color: filter === "pending"  ? "var(--color-oxblood)" : "var(--color-muted)" }}>Pending ({countPending})</Link>
        <Link href="/dashboard/questions?status=answered" className="lux-link" style={{ color: filter === "answered" ? "var(--color-emerald)" : "var(--color-muted)" }}>Answered ({countAnswered})</Link>
        <Link href="/dashboard/questions?status=all"      className="lux-link" style={{ color: filter === "all" ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
      </nav>

      {!rows || rows.length === 0 ? (
        <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
          {filter === "pending"
            ? "No customer questions waiting on you right now. We'll email you the moment one arrives."
            : "Nothing in this view."}
        </p>
      ) : (
        <ul className="space-y-6 max-w-4xl">
          {rows.map(r => (
            <li key={r.id} className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="flex items-baseline justify-between gap-4 mb-3 flex-wrap">
                <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                  {r.customer_name ?? "Anonymous"} · {formatDate(r.created_at)} · on{" "}
                  <Link href={`/products/${r.product_slug}`} className="lux-link font-mono">{r.product_slug}</Link>
                </p>
                <span
                  className="text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: r.status === "answered" ? "var(--color-emerald)" : r.status === "hidden" ? "var(--color-muted)" : "var(--color-saffron)" }}
                >
                  {r.status}
                </span>
              </div>

              <p className="serif italic text-lg mb-5" style={{ color: "var(--color-ink)" }}>
                &ldquo;{r.question}&rdquo;
              </p>

              {r.status === "answered" ? (
                <div className="pt-4 border-t" style={{ borderColor: "var(--color-rule)" }}>
                  <p className="text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--color-emerald)" }}>
                    Your reply · {r.answered_at && formatDate(r.answered_at)}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{r.answer}</p>
                </div>
              ) : r.status === "pending" ? (
                <form action={answerQuestion} className="pt-4 border-t space-y-3" style={{ borderColor: "var(--color-rule)" }}>
                  <input type="hidden" name="id" value={r.id} />
                  <textarea
                    name="answer"
                    required
                    minLength={4}
                    maxLength={4000}
                    rows={4}
                    placeholder="Reply to the customer. This will appear publicly on the product page."
                    className="w-full border bg-transparent p-3 text-base leading-relaxed"
                    style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
                    style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
                  >
                    Publish reply
                  </button>
                </form>
              ) : (
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>This question has been hidden by Asofe.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
