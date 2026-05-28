import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/data";
import { setOrderStatus } from "../actions";

const NEXT_STATES: Record<string, { label: string; to: "paid" | "packed" | "dispatched" | "delivered" | "cancelled" }[]> = {
  paid:       [{ label: "Mark packed",     to: "packed" },     { label: "Cancel",  to: "cancelled" }],
  packed:     [{ label: "Mark dispatched", to: "dispatched" }, { label: "Cancel",  to: "cancelled" }],
  dispatched: [{ label: "Mark delivered",  to: "delivered" }],
  delivered:  [],
  cancelled:  [],
  refunded:   [],
  pending:    [{ label: "Cancel", to: "cancelled" }],
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();
  const { data: order } = await sb
    .from("orders")
    .select("*, order_items(*), addresses(*)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const transitions = NEXT_STATES[order.status] ?? [];

  return (
    <>
      <Link href="/admin/orders" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← All orders
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Order</p>
      <h1 className="display text-4xl lg:text-5xl mb-2 tabular-nums" style={{ color: "var(--color-ink)" }}>
        #{order.id.slice(0, 8).toUpperCase()}
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        {new Date(order.created_at).toLocaleString()} · status: <strong style={{ color: "var(--color-ink)" }}>{order.status}</strong>
      </p>

      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
        <section className="lg:col-span-7">
          <h2 className="text-[11px] tracking-[0.18em] uppercase font-medium mb-6" style={{ color: "var(--color-muted)" }}>Items</h2>
          <ul className="space-y-px">
            {(order.order_items ?? []).map((it: { product_slug: string; name: string; brand_slug: string; size: string; qty: number; unit_price: number }, i: number) => (
              <li key={i} className="p-5 grid grid-cols-12 gap-4 items-center" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                <div className="col-span-7">
                  <p className="serif text-lg" style={{ color: "var(--color-ink)" }}>{it.name}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{it.brand_slug} · size {it.size}</p>
                </div>
                <p className="col-span-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>×{it.qty}</p>
                <p className="col-span-3 text-right tabular-nums" style={{ color: "var(--color-ink)" }}>{formatPrice(it.unit_price * it.qty)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-8 space-y-3 max-w-sm">
            <Row k="Subtotal" v={formatPrice(order.subtotal)} />
            <Row k="Shipping" v={order.shipping > 0 ? formatPrice(order.shipping) : "Free"} />
            <Row k="Total"    v={formatPrice(order.total)} bold />
          </dl>
        </section>

        <aside className="lg:col-span-5 space-y-8">
          <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
            <p className="eyebrow mb-3" style={{ color: "var(--color-cobalt)" }}>Customer</p>
            <p className="serif text-lg" style={{ color: "var(--color-ink)" }}>{order.customer_email}</p>
          </div>

          {order.addresses && (
            <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <p className="eyebrow mb-3" style={{ color: "var(--color-cobalt)" }}>Shipping to</p>
              <address className="not-italic text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>
                {order.addresses.full_name}<br />
                {order.addresses.line1}<br />
                {order.addresses.line2 && <>{order.addresses.line2}<br /></>}
                {order.addresses.city} {order.addresses.postcode}<br />
                {order.addresses.country}
                {order.addresses.phone && <><br />Tel {order.addresses.phone}</>}
              </address>
            </div>
          )}

          {transitions.length > 0 && (
            <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <p className="eyebrow mb-4" style={{ color: "var(--color-saffron)" }}>Move forward</p>
              <div className="flex flex-col gap-2">
                {transitions.map(t => (
                  <form key={t.to} action={setOrderStatus.bind(null, order.id, t.to)}>
                    <button type="submit" className="w-full py-3 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ backgroundColor: t.to === "cancelled" ? "var(--color-oxblood)" : "var(--color-ink)", color: "var(--color-ground)" }}>
                      {t.label}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}

          {order.stripe_payment_intent_id && (
            <div className="p-6 text-xs" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)", color: "var(--color-muted)" }}>
              <p className="eyebrow mb-2">Stripe</p>
              <p className="break-all">{order.stripe_payment_intent_id}</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className={bold ? "font-medium tabular-nums" : "tabular-nums"} style={{ color: "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}
