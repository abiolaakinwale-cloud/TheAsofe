import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatPrice, formatDate, ORDER_STATUS_LABEL } from "@/lib/account";

export default async function CustomerOrdersList() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account/orders");

  const { data: orders } = await sb
    .from("orders")
    .select("id, created_at, status, total, currency")
    .order("created_at", { ascending: false });

  // Years that contain at least one order — drives the export dropdown
  const years = Array.from(
    new Set((orders ?? []).map(o => new Date(o.created_at).getUTCFullYear()))
  ).sort((a, b) => b - a);

  return (
    <>
      <Link href="/account" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Overview
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Your archive</p>
      <h1 className="display text-4xl lg:text-5xl mb-8" style={{ color: "var(--color-ink)" }}>Orders.</h1>

      {(orders?.length ?? 0) > 0 && (
        <div className="mb-12 flex items-center gap-4 flex-wrap text-[11px] tracking-[0.18em] uppercase">
          <span style={{ color: "var(--color-muted)" }}>Download history</span>
          <a
            href="/account/orders/export"
            className="lux-link"
            style={{ color: "var(--color-ink)" }}
          >
            CSV (all) →
          </a>
          {years.map(y => (
            <span key={y} className="inline-flex items-center gap-3">
              <span style={{ color: "var(--color-rule)" }}>·</span>
              <a href={`/account/orders/export?year=${y}`} className="lux-link" style={{ color: "var(--color-muted)" }}>
                CSV {y}
              </a>
              <a href={`/account/orders/statement?year=${y}`} className="lux-link" style={{ color: "var(--color-muted)" }}>
                Statement {y} (PDF)
              </a>
            </span>
          ))}
        </div>
      )}

      {(orders?.length ?? 0) === 0 ? (
        <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
          You have not placed an order yet. <Link href="/" className="lux-link">Begin with the catalogue.</Link>
        </p>
      ) : (
        <ul className="max-w-4xl">
          {orders!.map(o => (
            <li key={o.id} className="py-5 flex items-center justify-between gap-6 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <div>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="text-sm tracking-[0.14em] uppercase lux-link"
                  style={{ color: "var(--color-ink)" }}
                >
                  Order {o.id.slice(0, 8)}
                </Link>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                  {formatDate(o.created_at)} · {ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL] ?? o.status}
                </p>
              </div>
              <p className="text-sm tabular-nums" style={{ color: "var(--color-ink)" }}>
                {formatPrice(o.total, o.currency)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
