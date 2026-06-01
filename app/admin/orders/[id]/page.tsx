import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/data";
import { setOrderStatus, dispatchOrder } from "../actions";
import AuditPanel from "@/components/admin/AuditPanel";

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
                {transitions.filter(t => t.to !== "dispatched").map(t => (
                  <form key={t.to} action={setOrderStatus.bind(null, order.id, t.to)}>
                    <button type="submit" className="w-full py-3 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ backgroundColor: t.to === "cancelled" ? "var(--color-oxblood)" : "var(--color-ink)", color: "var(--color-ground)" }}>
                      {t.label}
                    </button>
                  </form>
                ))}
              </div>

              {transitions.some(t => t.to === "dispatched") && (
                <details className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-rule)" }}>
                  <summary className="cursor-pointer text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-cobalt)" }}>
                    Dispatch with tracking →
                  </summary>
                  <form action={dispatchOrder} className="mt-4 space-y-3">
                    <input type="hidden" name="id" value={order.id} />
                    <label className="block">
                      <span className="block mb-1 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Courier</span>
                      <input
                        name="courier"
                        required
                        list="couriers"
                        defaultValue={order.courier ?? ""}
                        placeholder="e.g. Royal Mail Tracked"
                        className="w-full h-10 border bg-transparent px-2 text-sm"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                      />
                      <datalist id="couriers">
                        <option value="Royal Mail Tracked" />
                        <option value="Royal Mail" />
                        <option value="DPD" />
                        <option value="Evri" />
                        <option value="Parcelforce" />
                        <option value="UPS" />
                        <option value="DHL" />
                        <option value="FedEx" />
                      </datalist>
                    </label>
                    <label className="block">
                      <span className="block mb-1 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Tracking reference</span>
                      <input
                        name="tracking_ref"
                        required
                        defaultValue={order.tracking_ref ?? ""}
                        placeholder="AB123456789GB"
                        className="w-full h-10 border bg-transparent px-2 text-sm font-mono"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                      />
                    </label>
                    <label className="block">
                      <span className="block mb-1 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Tracking URL (optional override)</span>
                      <input
                        name="tracking_url"
                        type="url"
                        defaultValue={order.tracking_url ?? ""}
                        placeholder="leave blank to auto-generate"
                        className="w-full h-10 border bg-transparent px-2 text-xs"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                      />
                    </label>
                    <label className="block">
                      <span className="block mb-1 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>ETA (days from today)</span>
                      <input
                        name="eta_days"
                        type="number"
                        min="1"
                        max="14"
                        defaultValue="3"
                        className="w-20 h-10 border bg-transparent px-2 text-sm text-center tabular-nums"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                      />
                    </label>
                    <button type="submit" className="w-full py-3 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ backgroundColor: "var(--color-emerald)", color: "var(--color-ground)" }}>
                      Mark dispatched + notify customer
                    </button>
                  </form>
                </details>
              )}
            </div>
          )}

          {order.stripe_payment_intent_id && (
            <div className="p-6 text-xs" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)", color: "var(--color-muted)" }}>
              <p className="eyebrow mb-2">Stripe</p>
              <p className="break-all">{order.stripe_payment_intent_id}</p>
            </div>
          )}

          <AuditPanel targetType="order" targetId={order.id} />
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
