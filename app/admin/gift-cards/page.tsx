import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatGbpPence } from "@/lib/gift-cards";

const STATUSES = ["active", "fully_redeemed", "cancelled", "refunded"] as const;
type Status = typeof STATUSES[number];

const colour: Record<Status, string> = {
  active:         "var(--color-emerald)",
  fully_redeemed: "var(--color-muted)",
  cancelled:      "var(--color-oxblood)",
  refunded:       "var(--color-oxblood)",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export default async function AdminGiftCardsList({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const filter = STATUSES.includes(status as Status) ? (status as Status) : null;

  const sb = getAdminSupabase();
  let query = sb
    .from("gift_cards")
    .select("id, code, initial_value_pence, balance_pence, status, recipient_email, recipient_name, purchaser_email, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter) query = query.eq("status", filter);
  if (q) query = query.or(`code.ilike.%${q}%,recipient_email.ilike.%${q}%,purchaser_email.ilike.%${q}%`);

  const { data: rows } = await query;

  const [counts, totals] = await Promise.all([
    Promise.all(STATUSES.map(s => sb.from("gift_cards").select("id", { count: "exact", head: true }).eq("status", s))),
    sb.from("gift_cards").select("balance_pence, initial_value_pence, status").limit(10_000),
  ]);
  const allCards = totals.data ?? [];
  const totalOutstanding = allCards.filter(c => c.status === "active").reduce((s, c) => s + c.balance_pence, 0);
  const totalIssued      = allCards.reduce((s, c) => s + c.initial_value_pence, 0);

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Gift cards</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {rows?.length ?? 0} {filter ? `${filter.replace(/_/g, " ")} ` : ""}{(rows?.length ?? 0) === 1 ? "card" : "cards"}.
      </h1>

      <div className="grid sm:grid-cols-2 gap-px mb-12 max-w-3xl">
        <Stat k="Outstanding balance"   v={formatGbpPence(totalOutstanding)} colour="var(--color-saffron)" />
        <Stat k="Total ever issued"     v={formatGbpPence(totalIssued)}      colour="var(--color-emerald)" />
      </div>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-8 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/gift-cards" className="lux-link" style={{ color: !filter ? "var(--color-ink)" : "var(--color-muted)" }}>All</Link>
        {STATUSES.map((s, i) => {
          const n = counts[i].count ?? 0;
          return (
            <Link key={s} href={`/admin/gift-cards?status=${s}`} className="lux-link" style={{ color: filter === s ? colour[s] : "var(--color-muted)" }}>
              {s.replace(/_/g, " ")} ({n})
            </Link>
          );
        })}
      </nav>

      <form className="mb-10 max-w-md">
        <input
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Search by code, recipient, or purchaser email…"
          className="w-full h-10 border bg-transparent px-3 text-sm"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
      </form>

      {!rows || rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No gift cards in this view.</p>
      ) : (
        <ul className="space-y-px max-w-6xl">
          {rows.map(c => (
            <li key={c.id}>
              <Link
                href={`/admin/gift-cards/${c.id}`}
                className="grid grid-cols-12 gap-4 items-baseline p-4 hover:bg-[var(--color-cream)] transition-colors"
                style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
              >
                <span className="col-span-12 lg:col-span-4 font-mono text-xs" style={{ color: "var(--color-ink)" }}>
                  {c.code}
                </span>
                <span className="col-span-6 lg:col-span-3 text-xs" style={{ color: "var(--color-muted)" }}>
                  {c.recipient_name ? `${c.recipient_name} · ` : ""}{c.recipient_email}
                </span>
                <span className="col-span-3 lg:col-span-1 text-xs text-right tabular-nums" style={{ color: "var(--color-muted)" }}>
                  {formatGbpPence(c.initial_value_pence)}
                </span>
                <span className="col-span-3 lg:col-span-2 text-sm text-right tabular-nums" style={{ color: c.balance_pence > 0 ? "var(--color-ink)" : "var(--color-muted)" }}>
                  {formatGbpPence(c.balance_pence)} left
                </span>
                <span className="col-span-12 lg:col-span-2 text-right text-[10px] tracking-[0.18em] uppercase" style={{ color: colour[c.status as Status] ?? "var(--color-muted)" }}>
                  {c.status.replace(/_/g, " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Stat({ k, v, colour }: { k: string; v: string; colour: string }) {
  return (
    <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[10px] tracking-[0.18em] uppercase mb-3" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-3xl tabular-nums" style={{ color: colour }}>{v}</p>
    </div>
  );
}
