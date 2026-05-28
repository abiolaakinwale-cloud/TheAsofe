import Image from "next/image";
import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/data";
import { setOrderStatus } from "../orders/actions";
import PrintButton from "./PrintButton";

type Item = {
  product_slug: string;
  brand_slug: string;
  name: string;
  size: string;
  qty: number;
  unit_price: number;
};
type Order = {
  id: string;
  status: "paid" | "packed";
  customer_email: string;
  total: number;
  created_at: string;
  order_items: Item[];
  addresses: {
    full_name: string | null;
    line1: string | null;
    city: string | null;
    postcode: string | null;
    country: string | null;
  } | null;
};

export default async function FulfilmentPage() {
  const sb = getAdminSupabase();
  const { data: rows } = await sb
    .from("orders")
    .select("id, status, customer_email, total, created_at, order_items(product_slug, brand_slug, name, size, qty, unit_price), addresses(full_name, line1, city, postcode, country)")
    .in("status", ["paid", "packed"])
    .order("created_at", { ascending: true });

  const orders = (rows ?? []) as unknown as Order[];

  // Pull product images for visual pick list
  const slugs = Array.from(new Set(orders.flatMap(o => o.order_items.map(i => i.product_slug))));
  const { data: products } = await sb
    .from("products")
    .select("slug, images")
    .in("slug", slugs.length ? slugs : ["__none__"]);
  const imageBySlug = new Map((products ?? []).map(p => [p.slug, p.images?.[0] ?? ""]));

  const toPack = orders.filter(o => o.status === "paid");
  const toDispatch = orders.filter(o => o.status === "packed");

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-6 mb-12 no-print">
        <div>
          <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>UK Fulfilment</p>
          <h1 className="display text-4xl lg:text-5xl" style={{ color: "var(--color-ink)" }}>
            {toPack.length + toDispatch.length} orders to handle.
          </h1>
          <p className="text-sm mt-3" style={{ color: "var(--color-muted)" }}>
            {toPack.length} to pack · {toDispatch.length} to dispatch
          </p>
        </div>
        <PrintButton />
      </div>

      <Section title="To pack" empty="Nothing in the pack queue." orders={toPack} imageBySlug={imageBySlug} nextLabel="Mark packed" nextTo="packed" />
      <div className="h-16" />
      <Section title="To dispatch" empty="Nothing awaiting dispatch." orders={toDispatch} imageBySlug={imageBySlug} nextLabel="Mark dispatched" nextTo="dispatched" />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </>
  );
}

function Section({
  title,
  empty,
  orders,
  imageBySlug,
  nextLabel,
  nextTo,
}: {
  title: string;
  empty: string;
  orders: Order[];
  imageBySlug: Map<string, string>;
  nextLabel: string;
  nextTo: "packed" | "dispatched";
}) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.18em] uppercase font-medium mb-6" style={{ color: "var(--color-muted)" }}>{title}</h2>
      {orders.length === 0 ? (
        <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>{empty}</p>
      ) : (
        <ul className="space-y-px">
          {orders.map(o => (
            <li key={o.id} className="p-6 lg:p-8" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <header className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
                <div>
                  <Link href={`/admin/orders/${o.id}`} className="serif text-xl lux-link tabular-nums" style={{ color: "var(--color-ink)" }}>
                    #{o.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <span className="text-xs ml-4" style={{ color: "var(--color-muted)" }}>
                    {new Date(o.created_at).toLocaleString()} · {o.customer_email} · {formatPrice(o.total)}
                  </span>
                </div>
                <form action={setOrderStatus.bind(null, o.id, nextTo)} className="no-print">
                  <button type="submit" className="px-5 py-2 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
                    {nextLabel}
                  </button>
                </form>
              </header>

              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                {o.order_items.map((it, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="relative w-16 h-20 shrink-0 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
                      {imageBySlug.get(it.product_slug) && (
                        <Image src={imageBySlug.get(it.product_slug)!} alt={it.name} fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="serif text-base truncate" style={{ color: "var(--color-ink)" }}>{it.name}</p>
                      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                        {it.brand_slug} · size <strong style={{ color: "var(--color-ink)" }}>{it.size}</strong> · qty <strong style={{ color: "var(--color-ink)" }}>{it.qty}</strong>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {o.addresses && (
                <p className="text-xs mt-6 pt-4 border-t" style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)" }}>
                  Ship to: <strong style={{ color: "var(--color-ink)" }}>{o.addresses.full_name}</strong>, {o.addresses.line1}, {o.addresses.city} {o.addresses.postcode}, {o.addresses.country}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
