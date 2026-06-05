import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { commerceEnabled } from "@/lib/launch-mode";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { clearBag } from "@/app/bag/actions";
import { formatPrice } from "@/lib/data";

export const metadata: Metadata = { title: "Thank you" };

type Item = {
  product_slug: string;
  name: string;
  size: string;
  qty: number;
  unit_price: number;
  brand_slug: string;
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  if (!commerceEnabled()) notFound();
  const { session_id } = await searchParams;
  if (!session_id || !isStripeConfigured()) redirect("/");

  // Look up the order via Stripe session → metadata.order_id
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(session_id);
  const orderId = session.metadata?.order_id;
  if (!orderId) redirect("/");

  const sb = getAdminSupabase();
  const { data: order } = await sb
    .from("orders")
    .select("*, order_items(*), addresses(*)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) redirect("/");

  const items: Item[] = order.order_items ?? [];
  const productSlugs = items.map(i => i.product_slug);
  const { data: products } = await sb
    .from("products")
    .select("slug, images")
    .in("slug", productSlugs.length ? productSlugs : ["__none__"]);
  const imageBySlug = new Map((products ?? []).map(p => [p.slug, p.images?.[0] ?? ""]));

  // Clear the bag now that the order is in. Best-effort; if cookie write fails the order is still safe.
  await clearBag();

  const orderShort = order.id.slice(0, 8).toUpperCase();
  const address = order.addresses;

  return (
    <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[72rem] mx-auto px-6 lg:px-12">
        <p className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>
          {order.status === "paid" ? "Order received" : "Processing"}
        </p>
        <h1 className="display text-[clamp(2.4rem,5vw,4.8rem)] mb-6 max-w-[16ch] leading-[1.04]" style={{ color: "var(--color-ink)" }}>
          Thank you. Your pieces are with us.
        </h1>
        <p className="text-base lg:text-lg leading-relaxed max-w-xl mb-12" style={{ color: "var(--color-ink-soft)" }}>
          Order <span className="tabular-nums">#{orderShort}</span>. A confirmation is on its way to{" "}
          <strong>{order.customer_email}</strong>. We'll write again when your pieces leave the UK hub.
        </p>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          <ul className="lg:col-span-7 space-y-px">
            {items.map((it, i) => (
              <li key={i} className="grid grid-cols-12 gap-4 p-6 items-center" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                <div className="col-span-3 lg:col-span-2 relative aspect-[4/5]" style={{ backgroundColor: "var(--color-cream)" }}>
                  {imageBySlug.get(it.product_slug) && (
                    <Image src={imageBySlug.get(it.product_slug)!} alt={it.name} fill sizes="120px" className="object-cover" />
                  )}
                </div>
                <div className="col-span-7 lg:col-span-7">
                  <p className="serif text-lg" style={{ color: "var(--color-ink)" }}>{it.name}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>Size {it.size} · qty {it.qty}</p>
                </div>
                <p className="col-span-2 lg:col-span-3 text-right tabular-nums" style={{ color: "var(--color-ink)" }}>
                  {formatPrice(it.unit_price * it.qty)}
                </p>
              </li>
            ))}
          </ul>

          <aside className="lg:col-span-5 space-y-8">
            <div className="p-8" style={{ backgroundColor: "var(--color-cream)" }}>
              <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Total</p>
              <dl className="space-y-3 text-sm">
                <Row k="Subtotal" v={formatPrice(order.subtotal)} />
                <Row k="Shipping" v={order.shipping > 0 ? formatPrice(order.shipping) : "Free"} />
                <hr style={{ borderColor: "var(--color-rule)" }} />
                <Row k="Total" v={formatPrice(order.total)} bold />
              </dl>
            </div>
            {address && (
              <div className="p-8" style={{ backgroundColor: "var(--color-cream)" }}>
                <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>Shipping to</p>
                <address className="not-italic text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>
                  {address.full_name}<br />
                  {address.line1}<br />
                  {address.line2 && <>{address.line2}<br /></>}
                  {address.city} {address.postcode}<br />
                  {address.country}
                </address>
              </div>
            )}
          </aside>
        </div>

        <div className="mt-16">
          <Link href="/" className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link" style={{ color: "var(--color-ink)" }}>
            Continue browsing →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className={bold ? "font-medium tabular-nums" : "tabular-nums"} style={{ color: "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}
