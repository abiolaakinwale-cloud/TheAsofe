import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAnonSupabase } from "@/lib/supabase/anon";
import { formatPrice, formatDate, ORDER_STATUS_LABEL } from "@/lib/account";

const TIMELINE: Array<{ key: string; label: string }> = [
  { key: "paid",       label: "Paid" },
  { key: "packed",     label: "Packed" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered",  label: "Delivered" },
];

export default async function CustomerOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signin?next=/account/orders/${id}`);

  const { data: order } = await sb
    .from("orders")
    .select("id, created_at, status, subtotal, shipping, total, currency, customer_email")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await sb
    .from("order_items")
    .select("id, product_slug, brand_slug, name, colour, size, qty, unit_price, lead_time_weeks")
    .eq("order_id", id);

  const { data: returnRow } = await sb
    .from("returns")
    .select("id, rma_number, status")
    .eq("order_id", id)
    .order("initiated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const returnEligible =
    !returnRow &&
    (order.status === "delivered" || order.status === "dispatched") &&
    (Date.now() - new Date(order.created_at).getTime()) / 86_400_000 <= 28;

  // Look up product images via anon client (catalogue is public).
  const slugs = (items ?? []).map(i => i.product_slug);
  const { data: products } = slugs.length
    ? await getAnonSupabase().from("products").select("slug, images").in("slug", slugs)
    : { data: [] };
  const imageBySlug = new Map<string, string | undefined>(
    (products ?? []).map(p => [p.slug, p.images?.[0]])
  );

  const status = order.status as keyof typeof ORDER_STATUS_LABEL;
  const reachedIndex = (() => {
    if (status === "cancelled" || status === "refunded") return -1;
    return ["paid", "packed", "dispatched", "delivered"].indexOf(status);
  })();

  return (
    <>
      <Link href="/account/orders" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Orders
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>
        {formatDate(order.created_at)}
      </p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        Order {order.id.slice(0, 8)}.
      </h1>
      <p className="serif italic text-lg mb-12" style={{ color: "var(--color-ink-soft)" }}>
        {ORDER_STATUS_LABEL[status] ?? status}
      </p>

      {/* Timeline */}
      {reachedIndex >= 0 && (
        <ol className="grid grid-cols-4 gap-4 mb-16 max-w-3xl">
          {TIMELINE.map((step, i) => {
            const reached = i <= reachedIndex;
            return (
              <li key={step.key} className="flex flex-col items-start">
                <span
                  className="block w-full h-px"
                  style={{ backgroundColor: reached ? "var(--color-emerald)" : "var(--color-rule)" }}
                />
                <span
                  className="mt-3 text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: reached ? "var(--color-ink)" : "var(--color-muted)" }}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-12 max-w-5xl">
        <div>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Pieces</h2>
          <ul className="space-y-6">
            {(items ?? []).map(it => {
              const img = imageBySlug.get(it.product_slug);
              return (
                <li key={it.id} className="flex gap-5 pb-6 border-b" style={{ borderColor: "var(--color-rule)" }}>
                  <div className="relative w-24 aspect-[3/4] flex-shrink-0" style={{ backgroundColor: "var(--color-cream)" }}>
                    {img && <Image src={img} alt="" fill sizes="96px" className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${it.product_slug}`} className="text-sm tracking-[0.10em] uppercase lux-link" style={{ color: "var(--color-ink)" }}>
                      {it.name}
                    </Link>
                    <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                      {it.brand_slug.replace(/-/g, " ")}{it.colour ? ` · ${it.colour}` : ""} · Size {it.size} · Qty {it.qty}
                    </p>
                    {it.lead_time_weeks && (
                      <p className="text-[10px] tracking-[0.18em] uppercase mt-2" style={{ color: "var(--color-emerald)" }}>
                        Made to order · ships in {it.lead_time_weeks} {it.lead_time_weeks === 1 ? "week" : "weeks"}
                      </p>
                    )}
                  </div>
                  <p className="text-sm tabular-nums" style={{ color: "var(--color-ink)" }}>
                    {formatPrice(it.unit_price * it.qty, order.currency)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <aside>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Summary</h2>
          <dl className="space-y-3 text-sm">
            <Row k="Subtotal"  v={formatPrice(order.subtotal, order.currency)} />
            <Row k="Shipping"  v={order.shipping === 0 ? "Included" : formatPrice(order.shipping, order.currency)} />
            <div className="pt-3 mt-3 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <Row k="Total" v={formatPrice(order.total, order.currency)} emphasis />
            </div>
          </dl>

          {returnEligible && (
            <Link
              href={`/account/orders/${order.id}/return`}
              className="block mt-8 w-full px-6 py-3 text-center text-[11px] tracking-[0.22em] uppercase font-medium border"
              style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
            >
              Request a return
            </Link>
          )}

          {returnRow && (
            <div className="mt-8 p-4 border" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
              <p className="eyebrow mb-2" style={{ color: "var(--color-oxblood)" }}>Return in progress</p>
              <Link href={`/account/returns/${returnRow.id}`} className="lux-link text-sm" style={{ color: "var(--color-ink)" }}>
                {returnRow.rma_number} · {returnRow.status} →
              </Link>
            </div>
          )}

          <p className="mt-10 text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
            For questions about this order, write to{" "}
            <a className="lux-link" href="mailto:correspondence@theasofe.com">correspondence@theasofe.com</a>{" "}
            quoting <span className="font-mono">{order.id.slice(0, 8)}</span>.
          </p>
        </aside>
      </section>
    </>
  );
}

function Row({ k, v, emphasis }: { k: string; v: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={emphasis ? "text-sm tracking-[0.14em] uppercase" : ""} style={{ color: "var(--color-ink-soft)" }}>{k}</dt>
      <dd className={`tabular-nums ${emphasis ? "display text-2xl" : ""}`} style={{ color: "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}
