import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatPrice, formatDate, ORDER_STATUS_LABEL } from "@/lib/account";

/**
 * Printable single-order receipt — customer's record / expense claim /
 * gift-receipt artefact. Same Cmd/Ctrl-P → Save as PDF pattern as the
 * customs declaration and annual statement.
 */
export default async function CustomerOrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signin?next=/account/orders/${id}/receipt`);

  const { data: order } = await sb
    .from("orders")
    .select(`
      id, created_at, status, subtotal, shipping, total, currency, customer_email,
      paid_at, dispatched_at, delivered_at, cancelled_at,
      courier, tracking_ref, gift_card_code, gift_card_discount,
      stripe_payment_intent_id,
      order_items(name, brand_slug, colour, size, qty, unit_price),
      addresses:shipping_address_id(full_name, line1, line2, city, postcode, country, phone)
    `)
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  type Address = { full_name: string; line1: string; line2: string | null; city: string; postcode: string; country: string; phone: string | null };
  type Item = { name: string; brand_slug: string; colour: string | null; size: string; qty: number; unit_price: number };
  const addrRaw = order.addresses as unknown as Address | Address[] | null;
  const address: Address | null = Array.isArray(addrRaw) ? (addrRaw[0] ?? null) : addrRaw;
  const items = (order.order_items as Item[]) ?? [];

  const statusLabel = ORDER_STATUS_LABEL[order.status as keyof typeof ORDER_STATUS_LABEL] ?? order.status;
  const receiptNumber = `ASF-${id.slice(0, 8).toUpperCase()}`;
  const issuedDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .receipt-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
        @page { size: A4; margin: 14mm; }
      `}</style>

      <div className="no-print mb-6 flex items-center gap-4 flex-wrap">
        <Link href={`/account/orders/${id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
          ← Back to order
        </Link>
        <span style={{ color: "var(--color-muted)" }}>·</span>
        <a
          href="#"
          onClick={e => { e.preventDefault(); if (typeof window !== "undefined") window.print(); }}
          className="px-5 py-2 text-[11px] tracking-[0.22em] uppercase font-medium"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
        >
          Print / Save as PDF →
        </a>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Tip: Cmd/Ctrl-P → "Save as PDF" produces a clean attachment.
        </span>
      </div>

      <div className="receipt-page mx-auto max-w-[210mm] p-12 bg-white" style={{ color: "#000", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {/* Header */}
        <header className="flex items-start justify-between mb-10 pb-6 border-b border-black">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase mb-2">Receipt</p>
            <h1 className="text-3xl font-light tracking-tight">ASOFE</h1>
            <p className="text-[10px] mt-1">A trading name of Kadd Consulting Limited</p>
          </div>
          <div className="text-right text-[11px]">
            <p className="text-[10px] uppercase tracking-wider">Receipt no.</p>
            <p className="font-mono text-base mb-3">{receiptNumber}</p>
            <p className="text-[10px] uppercase tracking-wider">Issued</p>
            <p>{issuedDate}</p>
          </div>
        </header>

        {/* Parties + order metadata */}
        <section className="grid grid-cols-2 gap-12 mb-10 text-[11px] leading-relaxed">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-2">Billed to</p>
            <p className="font-medium text-sm mb-1">{address?.full_name ?? order.customer_email}</p>
            {address && (
              <>
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>{address.city} {address.postcode}</p>
                <p>{address.country}</p>
              </>
            )}
            <p className="mt-2">{order.customer_email}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-2">Order details</p>
            <Meta k="Order date"   v={formatDate(order.created_at)} />
            <Meta k="Order status" v={statusLabel} />
            {order.paid_at       && <Meta k="Paid"       v={formatDate(order.paid_at)} />}
            {order.dispatched_at && <Meta k="Dispatched" v={formatDate(order.dispatched_at)} />}
            {order.delivered_at  && <Meta k="Delivered"  v={formatDate(order.delivered_at)} />}
            {order.cancelled_at  && <Meta k="Cancelled"  v={formatDate(order.cancelled_at)} />}
            {order.courier       && <Meta k="Courier"    v={order.courier} />}
            {order.tracking_ref  && <Meta k="Tracking"   v={order.tracking_ref} />}
          </div>
        </section>

        {/* Items */}
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-wider mb-3">Items</p>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-2 pr-2 text-[9px] uppercase tracking-wider font-medium">Piece</th>
                <th className="text-left py-2 px-2 text-[9px] uppercase tracking-wider font-medium">Designer</th>
                <th className="text-left py-2 px-2 text-[9px] uppercase tracking-wider font-medium">Variant</th>
                <th className="text-right py-2 px-2 text-[9px] uppercase tracking-wider font-medium">Qty</th>
                <th className="text-right py-2 px-2 text-[9px] uppercase tracking-wider font-medium">Unit</th>
                <th className="text-right py-2 pl-2 text-[9px] uppercase tracking-wider font-medium">Line</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-black/10">
                  <td className="py-2 pr-2 align-top">{it.name}</td>
                  <td className="py-2 px-2 align-top capitalize">{it.brand_slug.replace(/-/g, " ")}</td>
                  <td className="py-2 px-2 align-top">{it.colour ? `${it.colour} · ` : ""}Size {it.size}</td>
                  <td className="py-2 px-2 align-top text-right tabular-nums">{it.qty}</td>
                  <td className="py-2 px-2 align-top text-right tabular-nums">{formatPrice(it.unit_price, order.currency)}</td>
                  <td className="py-2 pl-2 align-top text-right tabular-nums">{formatPrice(it.unit_price * it.qty, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className="mb-10 max-w-sm ml-auto text-[11px]">
          <TotalRow k="Subtotal" v={formatPrice(order.subtotal, order.currency)} />
          <TotalRow k="Shipping" v={order.shipping === 0 ? "Included" : formatPrice(order.shipping, order.currency)} />
          {order.gift_card_code && order.gift_card_discount > 0 && (
            <TotalRow
              k={`Gift card · ${order.gift_card_code.slice(-9)}`}
              v={`−${formatPrice(order.gift_card_discount, order.currency)}`}
            />
          )}
          <div className="border-t border-black mt-2 pt-2">
            <TotalRow k="Total paid" v={formatPrice(order.total, order.currency)} bold />
          </div>
          {order.stripe_payment_intent_id && (
            <p className="mt-3 text-[9px] text-black/60">
              Charged to the card on file via Stripe.
              <br />Payment reference: <span className="font-mono">{order.stripe_payment_intent_id.slice(0, 24)}</span>
            </p>
          )}
        </section>

        <footer className="mt-12 pt-6 border-t border-black/20 text-[9px] text-black/60 leading-relaxed">
          <p>
            This receipt was generated from your Asofe account on {issuedDate}. Asofe is a trading name of Kadd Consulting
            Limited, registered in England and Wales · Company number 15467682 · Registered office 33 Lansbury Road, Newton
            Leys, Bletchley, Bucks, MK3 5QP. For questions, write to{" "}
            <span className="font-mono">correspondence@theasofe.com</span> quoting{" "}
            <span className="font-mono">{receiptNumber}</span>.
          </p>
        </footer>
      </div>
    </>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-1">
      <span className="text-[9px] uppercase tracking-wider text-black/60">{k}</span>
      <span className="text-[11px]">{v}</span>
    </div>
  );
}

function TotalRow({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className={bold ? "text-[11px] uppercase tracking-wider font-medium" : "text-[10px] uppercase tracking-wider text-black/60"}>{k}</span>
      <span className={`tabular-nums ${bold ? "text-base font-medium" : "text-[11px]"}`}>{v}</span>
    </div>
  );
}
