import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import Stars from "@/components/Stars";
import { setReviewStatus } from "./actions";

const STATUSES = ["published", "hidden", "flagged"] as const;
type Status = typeof STATUSES[number];

const colour: Record<Status, string> = {
  published: "var(--color-emerald)",
  hidden:    "var(--color-muted)",
  flagged:   "var(--color-oxblood)",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as Status) ? (status as Status) : null;

  const sb = getAdminSupabase();
  let q = sb
    .from("reviews")
    .select("id, product_slug, brand_slug, rating, title, body, status, customer_name, created_at, order_id")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter) q = q.eq("status", filter);
  const { data: rows } = await q;

  const counts = await Promise.all(
    STATUSES.map(s => sb.from("reviews").select("id", { count: "exact", head: true }).eq("status", s))
  );

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Reviews</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {rows?.length ?? 0} {filter ? `${filter} ` : ""}{(rows?.length ?? 0) === 1 ? "review" : "reviews"}.
      </h1>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/reviews" className="lux-link" style={{ color: !filter ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
        {STATUSES.map((s, i) => {
          const n = counts[i].count ?? 0;
          return (
            <Link key={s} href={`/admin/reviews?status=${s}`} className="lux-link" style={{ color: filter === s ? colour[s] : "var(--color-muted)" }}>
              {s} ({n})
            </Link>
          );
        })}
      </nav>

      {!rows || rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No reviews in this view.</p>
      ) : (
        <ul className="space-y-px">
          {rows.map(r => (
            <li key={r.id} className="grid grid-cols-12 gap-4 p-5 items-start" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="col-span-12 lg:col-span-2 flex flex-col gap-1">
                <Stars value={r.rating} size="sm" />
                <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                  {formatDate(r.created_at)}
                </span>
              </div>
              <div className="col-span-12 lg:col-span-7">
                {r.title && <p className="text-sm font-medium mb-2" style={{ color: "var(--color-ink)" }}>{r.title}</p>}
                {r.body && <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--color-ink-soft)" }}>{r.body}</p>}
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                  {r.customer_name ?? "Anonymous"}
                  {" · "}
                  <Link href={`/products/${r.product_slug}`} className="lux-link font-mono">{r.product_slug}</Link>
                  {" · "}
                  <Link href={`/admin/orders/${r.order_id}`} className="lux-link font-mono">{r.order_id.slice(0, 8)}</Link>
                </p>
              </div>
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-2 items-stretch">
                <span className="text-[10px] tracking-[0.18em] uppercase text-right" style={{ color: colour[r.status as Status] ?? "var(--color-muted)" }}>
                  {r.status}
                </span>
                {r.status === "published" ? (
                  <form action={setReviewStatus.bind(null, r.id, "hidden")}>
                    <button type="submit" className="w-full py-2 text-[10px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-oxblood)", color: "var(--color-oxblood)" }}>
                      Hide
                    </button>
                  </form>
                ) : (
                  <form action={setReviewStatus.bind(null, r.id, "published")}>
                    <button type="submit" className="w-full py-2 text-[10px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-emerald)", color: "var(--color-emerald)" }}>
                      Publish
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
