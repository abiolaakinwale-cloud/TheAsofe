import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatDate, formatPrice, RETURN_STATUS_LABEL, RETURN_REASON_LABEL } from "@/lib/account";
import { markReturnReceived, approveReturnRefund, rejectReturn } from "../actions";

export default async function AdminReturnDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();

  const { data: r } = await sb
    .from("returns")
    .select("id, rma_number, status, reason, customer_note, admin_note, refund_amount, refund_currency, stripe_refund_id, initiated_at, received_at, refunded_at, order_id, customer_id")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const [{ data: order }, { data: items }, { data: customer }] = await Promise.all([
    sb.from("orders").select("id, customer_email, status, total, currency, stripe_payment_intent_id").eq("id", r.order_id).maybeSingle(),
    sb.from("return_items").select("id, qty, order_items:order_item_id(name, colour, size, unit_price, brand_slug)").eq("return_id", id),
    sb.from("profiles").select("email, role").eq("id", r.customer_id).maybeSingle(),
  ]);

  type Row = { id: string; qty: number; order_items: { name: string; colour: string | null; size: string; unit_price: number; brand_slug: string } | null };
  const rows = (items as unknown as Row[]) ?? [];
  const refundAmount = rows.reduce((sum, i) => sum + (i.order_items?.unit_price ?? 0) * i.qty, 0);

  const canMarkReceived = r.status === "requested" || r.status === "approved";
  const canRefund       = r.status === "received" || r.status === "approved";
  const canReject       = r.status !== "refunded" && r.status !== "rejected" && r.status !== "cancelled";

  return (
    <>
      <Link href="/admin/returns" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Returns
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
        <h1 className="display text-4xl lg:text-5xl font-mono tracking-wide" style={{ color: "var(--color-ink)" }}>
          {r.rma_number}
        </h1>
        <span className="text-[11px] tracking-[0.22em] uppercase px-3 py-1" style={{
          backgroundColor: r.status === "refunded" ? "var(--color-emerald)" : r.status === "rejected" ? "var(--color-oxblood)" : "var(--color-cream)",
          color: r.status === "refunded" || r.status === "rejected" ? "var(--color-ground)" : "var(--color-ink)",
        }}>
          {RETURN_STATUS_LABEL[r.status as keyof typeof RETURN_STATUS_LABEL] ?? r.status}
        </span>
      </div>
      <p className="serif italic mb-12" style={{ color: "var(--color-ink-soft)" }}>
        {RETURN_REASON_LABEL[r.reason as keyof typeof RETURN_REASON_LABEL] ?? r.reason} · initiated {formatDate(r.initiated_at)}
      </p>

      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-12 max-w-6xl">
        <div>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Items</h2>
          <ul className="space-y-3 mb-10">
            {rows.map(it => (
              <li key={it.id} className="grid grid-cols-12 gap-4 items-baseline border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
                <p className="col-span-8 text-sm" style={{ color: "var(--color-ink)" }}>
                  {it.order_items?.name ?? "—"}
                  <span className="block text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                    {it.order_items?.brand_slug?.replace(/-/g, " ")}{it.order_items?.colour ? ` · ${it.order_items.colour}` : ""} · Size {it.order_items?.size}
                  </span>
                </p>
                <p className="col-span-2 text-sm text-right tabular-nums" style={{ color: "var(--color-muted)" }}>×{it.qty}</p>
                <p className="col-span-2 text-sm text-right tabular-nums" style={{ color: "var(--color-ink)" }}>
                  {it.order_items ? formatPrice(it.order_items.unit_price * it.qty, r.refund_currency) : "—"}
                </p>
              </li>
            ))}
          </ul>
          <p className="flex items-baseline justify-between text-base font-medium mb-12 pt-3 border-t" style={{ borderColor: "var(--color-ink)" }}>
            <span className="text-[11px] tracking-[0.22em] uppercase" style={{ color: "var(--color-ink)" }}>Refund amount</span>
            <span className="display text-2xl tabular-nums" style={{ color: "var(--color-ink)" }}>
              {formatPrice(refundAmount, r.refund_currency)}
            </span>
          </p>

          {r.customer_note && (
            <div className="mb-10 p-5" style={{ backgroundColor: "var(--color-cream)" }}>
              <p className="eyebrow mb-3" style={{ color: "var(--color-muted)" }}>Customer note</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>{r.customer_note}</p>
            </div>
          )}
          {r.admin_note && (
            <div className="mb-10 p-5 border-l-4" style={{ backgroundColor: "var(--color-cream)", borderColor: "var(--color-oxblood)" }}>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Admin note</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>{r.admin_note}</p>
            </div>
          )}

          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Actions</h2>
          <div className="flex flex-wrap gap-3 mb-6">
            {canMarkReceived && (
              <form action={markReturnReceived.bind(null, id)}>
                <button
                  type="submit"
                  className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
                  style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
                >
                  Mark received at hub
                </button>
              </form>
            )}
            {canRefund && (
              <form action={approveReturnRefund.bind(null, id)}>
                <button
                  type="submit"
                  className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
                  style={{ backgroundColor: "var(--color-emerald)", color: "var(--color-ground)" }}
                >
                  Approve refund · {formatPrice(refundAmount, r.refund_currency)}
                </button>
              </form>
            )}
          </div>

          {canReject && (
            <details className="border-t pt-6" style={{ borderColor: "var(--color-rule)" }}>
              <summary className="cursor-pointer text-[11px] tracking-[0.22em] uppercase font-medium" style={{ color: "var(--color-oxblood)" }}>
                Reject this return
              </summary>
              <form action={rejectReturn} className="mt-4 space-y-3 max-w-xl">
                <input type="hidden" name="id" value={id} />
                <textarea
                  name="rejection_reason"
                  required
                  rows={3}
                  placeholder="Reason for rejection (sent to customer)"
                  className="w-full border p-3 text-base bg-transparent"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                />
                <button
                  type="submit"
                  className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
                  style={{ borderColor: "var(--color-oxblood)", color: "var(--color-oxblood)" }}
                >
                  Confirm rejection
                </button>
              </form>
            </details>
          )}
        </div>

        <aside>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Particulars</h2>
          <dl className="space-y-3 text-sm">
            <Row k="Order"            v={r.order_id.slice(0, 8)} link={`/admin/orders/${r.order_id}`} />
            <Row k="Customer"         v={customer?.email ?? order?.customer_email ?? "—"} />
            <Row k="Order status"     v={order?.status ?? "—"} />
            <Row k="Payment intent"   v={order?.stripe_payment_intent_id?.slice(0, 16) ?? "—"} />
            <Row k="Initiated"        v={formatDate(r.initiated_at)} />
            {r.received_at && <Row k="Received" v={formatDate(r.received_at)} />}
            {r.refunded_at && <Row k="Refunded" v={formatDate(r.refunded_at)} />}
            {r.stripe_refund_id && <Row k="Stripe refund" v={r.stripe_refund_id.slice(0, 18)} />}
          </dl>
        </aside>
      </section>
    </>
  );
}

function Row({ k, v, link }: { k: string; v: string; link?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className="font-mono text-xs" style={{ color: "var(--color-ink)" }}>
        {link ? <Link href={link} className="lux-link">{v}</Link> : v}
      </dd>
    </div>
  );
}
