import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/account";

export default async function SellerPayoutDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/brand-signin?next=/dashboard/payouts/${id}`);

  // RLS handles ownership — selects only return rows the seller can see
  const { data: p } = await sb
    .from("payouts")
    .select("id, brand, status, period_start, period_end, gross_total, refund_total, commission_amount, net_amount, currency, paid_via, paid_ref, paid_at, sent_at, created_at, notes")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const { data: lines } = await sb
    .from("payout_lines")
    .select("id, order_id, product_name, qty, unit_price, gross_amount, refund_amount, net_amount")
    .eq("payout_id", id)
    .order("gross_amount", { ascending: false });

  return (
    <>
      <Link href="/dashboard/payouts" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Payouts
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>{formatDate(p.created_at)}</p>
      <h1 className="display text-4xl lg:text-5xl mb-2" style={{ color: "var(--color-ink)" }}>
        {p.period_start} → {p.period_end}
      </h1>
      <p className="serif italic mb-10" style={{ color: "var(--color-ink-soft)" }}>
        {p.status === "paid" && p.paid_at ? `Paid ${formatDate(p.paid_at)} via ${p.paid_via}` :
         p.status === "sent" && p.sent_at ? `Statement sent ${formatDate(p.sent_at)}` :
         p.status === "draft" ? "Draft — Asofe is finalising" :
         "Cancelled"}
      </p>

      <section className="grid lg:grid-cols-[2fr_1fr] gap-12 max-w-6xl">
        <div>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Pieces sold ({lines?.length ?? 0})</h2>
          <ul className="space-y-px mb-8">
            {(lines ?? []).map(l => (
              <li key={l.id} className="grid grid-cols-12 gap-4 items-baseline p-3 text-sm" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                <p className="col-span-12 lg:col-span-5" style={{ color: "var(--color-ink)" }}>
                  {l.product_name}
                  <span className="block text-xs mt-1 font-mono" style={{ color: "var(--color-muted)" }}>
                    {l.qty} × {formatPrice(l.unit_price, p.currency)} · order {l.order_id.slice(0, 8)}
                  </span>
                </p>
                <p className="col-span-4 lg:col-span-3 text-right tabular-nums" style={{ color: "var(--color-ink)" }}>{formatPrice(l.gross_amount, p.currency)}</p>
                <p className="col-span-4 lg:col-span-2 text-right tabular-nums" style={{ color: l.refund_amount > 0 ? "var(--color-oxblood)" : "var(--color-muted)" }}>
                  {l.refund_amount > 0 ? `−${formatPrice(l.refund_amount, p.currency)}` : "—"}
                </p>
                <p className="col-span-4 lg:col-span-2 text-right tabular-nums" style={{ color: "var(--color-ink)" }}>{formatPrice(l.net_amount, p.currency)}</p>
              </li>
            ))}
          </ul>

          <a
            href={`/admin/payouts/${id}/export`}
            className="inline-block px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
            style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
          >
            Download CSV ↓
          </a>
        </div>

        <aside>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Reconciliation</h2>
          <dl className="space-y-3 text-sm">
            <Row k="Gross sales"        v={formatPrice(p.gross_total, p.currency)} />
            <Row k="Refunds in period"  v={p.refund_total > 0 ? `−${formatPrice(p.refund_total, p.currency)}` : "—"} colour={p.refund_total > 0 ? "var(--color-oxblood)" : undefined} />
            <Row k="Net of refunds"     v={formatPrice(p.gross_total - p.refund_total, p.currency)} />
            <Row k="Asofe commission"   v={`−${formatPrice(p.commission_amount, p.currency)}`} colour="var(--color-muted)" />
            <div className="pt-3 mt-3 border-t" style={{ borderColor: "var(--color-ink)" }}>
              <Row k="Owed to you" v={formatPrice(p.net_amount, p.currency)} emphasis />
            </div>
          </dl>

          {p.status === "paid" && (
            <div className="mt-10 p-5" style={{ backgroundColor: "var(--color-cream)" }}>
              <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>Settled ✓</p>
              <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                {formatPrice(p.net_amount, p.currency)} sent via <strong>{p.paid_via}</strong>
              </p>
              {p.paid_ref && (
                <p className="text-xs mt-2 font-mono" style={{ color: "var(--color-muted)" }}>Ref: {p.paid_ref}</p>
              )}
            </div>
          )}
        </aside>
      </section>
    </>
  );
}

function Row({ k, v, emphasis, colour }: { k: string; v: string; emphasis?: boolean; colour?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className={`tabular-nums ${emphasis ? "display text-2xl" : ""}`} style={{ color: colour ?? "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}
