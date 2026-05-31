import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatDate, formatPrice, RETURN_STATUS_LABEL, RETURN_REASON_LABEL } from "@/lib/account";

const TIMELINE: Array<{ key: string; label: string }> = [
  { key: "requested", label: "Requested" },
  { key: "received",  label: "Received" },
  { key: "refunded",  label: "Refunded" },
];

export default async function CustomerReturnDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signin?next=/account/returns/${id}`);

  const { data: r } = await sb
    .from("returns")
    .select("id, rma_number, status, reason, customer_note, refund_amount, refund_currency, initiated_at, received_at, refunded_at, order_id")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const { data: items } = await sb
    .from("return_items")
    .select("id, qty, order_item_id, order_items:order_item_id(name, colour, size, unit_price)")
    .eq("return_id", id);

  type Row = { id: string; qty: number; order_item_id: string; order_items: { name: string; colour: string | null; size: string; unit_price: number } | null };
  const rows = (items as unknown as Row[]) ?? [];

  const reached = (() => {
    if (r.status === "rejected" || r.status === "cancelled") return -1;
    return ["requested", "received", "refunded"].indexOf(r.status);
  })();

  return (
    <>
      <Link href="/account/returns" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Returns
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>{formatDate(r.initiated_at)}</p>
      <h1 className="display text-4xl lg:text-5xl mb-3 font-mono tracking-wide" style={{ color: "var(--color-ink)" }}>
        {r.rma_number}
      </h1>
      <p className="serif italic text-lg mb-12" style={{ color: "var(--color-ink-soft)" }}>
        {RETURN_STATUS_LABEL[r.status as keyof typeof RETURN_STATUS_LABEL] ?? r.status}
      </p>

      {isNew === "1" && (
        <div className="mb-12 p-6 max-w-3xl" style={{ backgroundColor: "var(--color-cream)" }}>
          <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>Next steps</p>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--color-ink)" }}>
            Post your pieces in their original packaging to:
          </p>
          <p className="font-mono text-sm leading-relaxed mb-3" style={{ color: "var(--color-ink)" }}>
            Asofe Returns · {r.rma_number}<br />
            Address shared on request — email{" "}
            <a className="lux-link" href="mailto:correspondence@theasofe.com">correspondence@theasofe.com</a>{" "}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Once we receive the pieces and confirm condition, your refund will be processed to the original payment method (5-10 business days).
          </p>
        </div>
      )}

      {reached >= 0 && (
        <ol className="grid grid-cols-3 gap-4 mb-16 max-w-2xl">
          {TIMELINE.map((step, i) => {
            const hit = i <= reached;
            return (
              <li key={step.key} className="flex flex-col items-start">
                <span className="block w-full h-px" style={{ backgroundColor: hit ? "var(--color-emerald)" : "var(--color-rule)" }} />
                <span className="mt-3 text-[10px] tracking-[0.18em] uppercase" style={{ color: hit ? "var(--color-ink)" : "var(--color-muted)" }}>{step.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-12 max-w-5xl">
        <div>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Pieces returned</h2>
          <ul className="space-y-3">
            {rows.map(it => (
              <li key={it.id} className="flex items-baseline justify-between border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
                <div>
                  <p className="text-sm" style={{ color: "var(--color-ink)" }}>{it.order_items?.name ?? "—"}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                    {it.order_items?.colour ? `${it.order_items.colour} · ` : ""}Size {it.order_items?.size} · Qty {it.qty}
                  </p>
                </div>
                <p className="text-sm tabular-nums" style={{ color: "var(--color-ink)" }}>
                  {it.order_items ? formatPrice(it.order_items.unit_price * it.qty) : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <aside>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Particulars</h2>
          <dl className="space-y-3 text-sm">
            <Row k="Reason"      v={RETURN_REASON_LABEL[r.reason as keyof typeof RETURN_REASON_LABEL] ?? r.reason} />
            <Row k="Order"       v={r.order_id.slice(0, 8)} link={`/account/orders/${r.order_id}`} />
            <Row k="Initiated"   v={formatDate(r.initiated_at)} />
            {r.received_at && <Row k="Received" v={formatDate(r.received_at)} />}
            {r.refunded_at && <Row k="Refunded" v={formatDate(r.refunded_at)} />}
            {r.refund_amount && <Row k="Refund" v={formatPrice(r.refund_amount, r.refund_currency)} emphasis />}
          </dl>
          {r.customer_note && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <p className="eyebrow mb-2" style={{ color: "var(--color-muted)" }}>Your note</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{r.customer_note}</p>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}

function Row({ k, v, link, emphasis }: { k: string; v: string; link?: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className={`tabular-nums ${emphasis ? "display text-xl" : ""}`} style={{ color: "var(--color-ink)" }}>
        {link ? <Link href={link} className="lux-link font-mono">{v}</Link> : v}
      </dd>
    </div>
  );
}
