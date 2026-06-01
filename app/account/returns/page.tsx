import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatDate, RETURN_STATUS_LABEL } from "@/lib/account";

export const metadata = { title: "Returns" };

export default async function CustomerReturnsList() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account/returns");

  const { data: returns } = await sb
    .from("returns")
    .select("id, rma_number, status, reason, initiated_at, order_id")
    .order("initiated_at", { ascending: false });

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Account</p>
      <h1 className="display text-4xl lg:text-5xl mb-10" style={{ color: "var(--color-ink)" }}>
        Returns.
      </h1>

      {!returns || returns.length === 0 ? (
        <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
          No returns yet. If something doesn&apos;t suit, you can{" "}
          <Link href="/account/orders" className="lux-link" style={{ color: "var(--color-ink)" }}>request a return</Link>{" "}
          from any delivered order within 7 days.
        </p>
      ) : (
        <ul className="space-y-px max-w-4xl">
          {returns.map(r => (
            <li key={r.id}>
              <Link
                href={`/account/returns/${r.id}`}
                className="block p-6 hover:bg-[var(--color-cream)] transition-colors"
                style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm tracking-wide" style={{ color: "var(--color-ink)" }}>{r.rma_number}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                      {formatDate(r.initiated_at)} · Order {r.order_id.slice(0, 8)}
                    </p>
                  </div>
                  <span
                    className="text-[10px] tracking-[0.18em] uppercase px-3 py-1"
                    style={{
                      backgroundColor: r.status === "refunded" ? "var(--color-emerald)" : r.status === "rejected" ? "var(--color-oxblood)" : "var(--color-cream)",
                      color: r.status === "refunded" || r.status === "rejected" ? "var(--color-ground)" : "var(--color-ink)",
                    }}
                  >
                    {RETURN_STATUS_LABEL[r.status as keyof typeof RETURN_STATUS_LABEL] ?? r.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
