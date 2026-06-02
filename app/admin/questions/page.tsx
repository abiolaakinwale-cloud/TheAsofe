import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { setQuestionStatus } from "./actions";

const STATUSES = ["pending", "answered", "hidden", "flagged"] as const;
type Status = typeof STATUSES[number];

const colour: Record<Status, string> = {
  pending:  "var(--color-saffron)",
  answered: "var(--color-emerald)",
  hidden:   "var(--color-muted)",
  flagged:  "var(--color-oxblood)",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const filter = STATUSES.includes(status as Status) ? (status as Status) : null;

  const sb = getAdminSupabase();
  let query = sb
    .from("designer_questions")
    .select("id, product_slug, brand_slug, customer_name, question, answer, status, created_at, answered_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter) query = query.eq("status", filter);
  if (q)      query = query.or(`question.ilike.%${q}%,answer.ilike.%${q}%,product_slug.ilike.%${q}%,brand_slug.ilike.%${q}%`);

  const [{ data: rows }, counts] = await Promise.all([
    query,
    Promise.all(STATUSES.map(s => sb.from("designer_questions").select("id", { count: "exact", head: true }).eq("status", s))),
  ]);

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Customer questions</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        {rows?.length ?? 0} {filter ? `${filter} ` : ""}{(rows?.length ?? 0) === 1 ? "question" : "questions"}.
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        Sellers reply to their own brand&apos;s questions from /dashboard/questions. Admin moderates — hide spam, flag for review, restore false positives. Hidden questions never appear on the public product page.
      </p>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/questions" className="lux-link" style={{ color: !filter ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
        {STATUSES.map((s, i) => {
          const n = counts[i].count ?? 0;
          return (
            <Link key={s} href={`/admin/questions?status=${s}`} className="lux-link" style={{ color: filter === s ? colour[s] : "var(--color-muted)" }}>
              {s} ({n})
            </Link>
          );
        })}
      </nav>

      <form className="mb-10 max-w-md">
        <input
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Search question, answer, product or brand…"
          className="w-full h-10 border bg-transparent px-3 text-sm"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
      </form>

      {!rows || rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No questions in this view.</p>
      ) : (
        <ul className="space-y-6 max-w-5xl">
          {rows.map(r => (
            <li key={r.id} className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="flex items-baseline justify-between gap-4 mb-3 flex-wrap">
                <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                  {r.customer_name ?? "Anonymous"} · {formatDate(r.created_at)} · {r.brand_slug.replace(/-/g, " ")} ·{" "}
                  <Link href={`/products/${r.product_slug}`} className="lux-link font-mono">{r.product_slug}</Link>
                </p>
                <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: colour[r.status as Status] ?? "var(--color-muted)" }}>
                  {r.status}
                </span>
              </div>

              <p className="serif italic text-lg mb-4" style={{ color: "var(--color-ink)" }}>
                &ldquo;{r.question}&rdquo;
              </p>

              {r.answer && (
                <div className="pt-4 border-t mb-4" style={{ borderColor: "var(--color-rule)" }}>
                  <p className="text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--color-emerald)" }}>
                    Seller&apos;s reply{r.answered_at && ` · ${formatDate(r.answered_at)}`}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{r.answer}</p>
                </div>
              )}

              <div className="pt-4 border-t flex flex-wrap gap-3" style={{ borderColor: "var(--color-rule)" }}>
                {r.status !== "hidden" && (
                  <form action={setQuestionStatus.bind(null, r.id, "hidden")}>
                    <button type="submit" className="px-4 py-2 text-[10px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-oxblood)", color: "var(--color-oxblood)" }}>
                      Hide
                    </button>
                  </form>
                )}
                {r.status !== "flagged" && r.status !== "hidden" && (
                  <form action={setQuestionStatus.bind(null, r.id, "flagged")}>
                    <button type="submit" className="px-4 py-2 text-[10px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-saffron)", color: "var(--color-saffron)" }}>
                      Flag for review
                    </button>
                  </form>
                )}
                {(r.status === "hidden" || r.status === "flagged") && (
                  <form action={setQuestionStatus.bind(null, r.id, r.answer ? "answered" : "pending")}>
                    <button type="submit" className="px-4 py-2 text-[10px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-emerald)", color: "var(--color-emerald)" }}>
                      Restore
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
