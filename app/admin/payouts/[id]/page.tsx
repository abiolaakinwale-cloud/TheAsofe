import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatDate, formatPrice } from "@/lib/account";
import { sendPayoutStatement, markPayoutPaid, cancelPayout } from "../actions";

export default async function AdminPayoutDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();

  const { data: p } = await sb
    .from("payouts")
    .select("*, brands:brand(name, commission_rate)")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const { data: lines } = await sb
    .from("payout_lines")
    .select("id, order_id, product_name, qty, unit_price, gross_amount, refund_amount, net_amount")
    .eq("payout_id", id)
    .order("gross_amount", { ascending: false });

  const brandName = (p.brands as { name: string; commission_rate: number } | null)?.name ?? p.brand;

  return (
    <>
      <Link href="/admin/payouts" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Payouts
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
        <h1 className="display text-4xl lg:text-5xl" style={{ color: "var(--color-ink)" }}>
          {brandName}.
        </h1>
        <span className="text-[11px] tracking-[0.22em] uppercase px-3 py-1" style={{
          backgroundColor:
            p.status === "paid"      ? "var(--color-emerald)" :
            p.status === "cancelled" ? "var(--color-oxblood)" :
            p.status === "sent"      ? "var(--color-saffron)" : "var(--color-cream)",
          color: p.status === "paid" || p.status === "cancelled" ? "var(--color-ground)" : "var(--color-ink)",
        }}>
          {p.status}
        </span>
      </div>
      <p className="serif italic mb-12" style={{ color: "var(--color-ink-soft)" }}>
        Period {p.period_start} → {p.period_end} · created {formatDate(p.created_at)}
      </p>

      <section className="grid lg:grid-cols-[2fr_1fr] gap-12 max-w-6xl">
        <div>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Line items ({lines?.length ?? 0})</h2>
          <ul className="space-y-px mb-12">
            <li className="hidden lg:grid grid-cols-12 gap-4 text-[10px] tracking-[0.22em] uppercase pb-2" style={{ color: "var(--color-muted)" }}>
              <span className="col-span-5">Piece</span>
              <span className="col-span-1 text-right">Qty</span>
              <span className="col-span-2 text-right">Gross</span>
              <span className="col-span-2 text-right">Refund</span>
              <span className="col-span-2 text-right">Net</span>
            </li>
            {(lines ?? []).map(l => (
              <li key={l.id} className="grid grid-cols-12 gap-4 items-baseline p-3 text-sm" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                <p className="col-span-12 lg:col-span-5" style={{ color: "var(--color-ink)" }}>
                  {l.product_name}
                  <span className="block text-xs mt-1 font-mono lg:hidden" style={{ color: "var(--color-muted)" }}>
                    {l.qty} × {formatPrice(l.unit_price, p.currency)}
                  </span>
                </p>
                <p className="hidden lg:block lg:col-span-1 text-right tabular-nums" style={{ color: "var(--color-muted)" }}>{l.qty}</p>
                <p className="col-span-4 lg:col-span-2 text-right tabular-nums" style={{ color: "var(--color-ink)" }}>{formatPrice(l.gross_amount, p.currency)}</p>
                <p className="col-span-4 lg:col-span-2 text-right tabular-nums" style={{ color: l.refund_amount > 0 ? "var(--color-oxblood)" : "var(--color-muted)" }}>
                  {l.refund_amount > 0 ? `−${formatPrice(l.refund_amount, p.currency)}` : "—"}
                </p>
                <p className="col-span-4 lg:col-span-2 text-right tabular-nums" style={{ color: "var(--color-ink)" }}>{formatPrice(l.net_amount, p.currency)}</p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 mb-6">
            <a
              href={`/admin/payouts/${id}/export`}
              className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
              style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
            >
              Download CSV ↓
            </a>
            {p.status === "draft" && (
              <form action={sendPayoutStatement.bind(null, id)}>
                <button
                  type="submit"
                  className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
                  style={{ backgroundColor: "var(--color-cobalt)", color: "var(--color-ground)" }}
                >
                  Send statement to designer
                </button>
              </form>
            )}
            {(p.status === "draft" || p.status === "sent") && (
              <form action={cancelPayout.bind(null, id)}>
                <button
                  type="submit"
                  className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
                  style={{ borderColor: "var(--color-oxblood)", color: "var(--color-oxblood)" }}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>

          {(p.status === "draft" || p.status === "sent") && (
            <details className="border-t pt-6 mt-6 max-w-2xl" style={{ borderColor: "var(--color-rule)" }}>
              <summary className="cursor-pointer text-[11px] tracking-[0.22em] uppercase font-medium" style={{ color: "var(--color-emerald)" }}>
                Mark as paid
              </summary>
              <form action={markPayoutPaid} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={id} />
                <label className="block">
                  <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Method</span>
                  <input name="paid_via" required placeholder="Wise / Bank transfer / Revolut" className="w-full h-12 border bg-transparent px-3 text-base" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }} />
                </label>
                <label className="block">
                  <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Reference</span>
                  <input name="paid_ref" required placeholder="Transfer ID / cheque number" className="w-full h-12 border bg-transparent px-3 text-base" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }} />
                </label>
                <label className="block">
                  <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Notes (optional)</span>
                  <textarea name="notes" rows={2} className="w-full border bg-transparent p-3 text-base" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }} />
                </label>
                <button type="submit" className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-emerald)", color: "var(--color-ground)" }}>
                  Confirm payment of {formatPrice(p.net_amount, p.currency)}
                </button>
              </form>
            </details>
          )}
        </div>

        <aside>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Reconciliation</h2>
          <dl className="space-y-3 text-sm">
            <Row k="Gross sales"   v={formatPrice(p.gross_total, p.currency)} />
            <Row k="Refunds"       v={p.refund_total > 0 ? `−${formatPrice(p.refund_total, p.currency)}` : "—"} colour={p.refund_total > 0 ? "var(--color-oxblood)" : undefined} />
            <Row k="Net of refunds" v={formatPrice(p.gross_total - p.refund_total, p.currency)} />
            <Row k={`Commission (${Math.round(((p.brands as { commission_rate: number } | null)?.commission_rate ?? 0.30) * 100)} %)`} v={`−${formatPrice(p.commission_amount, p.currency)}`} colour="var(--color-muted)" />
            <div className="pt-3 mt-3 border-t" style={{ borderColor: "var(--color-ink)" }}>
              <Row k="Owed to designer" v={formatPrice(p.net_amount, p.currency)} emphasis />
            </div>
          </dl>

          {(p.paid_via || p.paid_ref) && (
            <div className="mt-10 pt-6 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <p className="eyebrow mb-3" style={{ color: "var(--color-muted)" }}>Payment</p>
              <dl className="space-y-2 text-xs">
                {p.paid_via && <Row k="Method" v={p.paid_via} />}
                {p.paid_ref && <Row k="Reference" v={p.paid_ref} />}
                {p.paid_at && <Row k="Paid on" v={formatDate(p.paid_at)} />}
              </dl>
            </div>
          )}
          {p.sent_at && !p.paid_at && (
            <p className="mt-6 text-xs" style={{ color: "var(--color-muted)" }}>Statement sent {formatDate(p.sent_at)}</p>
          )}
          {p.notes && (
            <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>{p.notes}</p>
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
