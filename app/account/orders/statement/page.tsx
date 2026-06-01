import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatPrice, formatDate, ORDER_STATUS_LABEL } from "@/lib/account";

/**
 * Printable annual statement of the signed-in customer's orders.
 * Customers use it as a personal record or for tax/expense purposes —
 * Cmd/Ctrl-P → "Save as PDF" yields a clean attachment.
 */
export default async function CustomerStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam && /^\d{4}$/.test(yearParam)
    ? Number(yearParam)
    : new Date().getUTCFullYear();

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signin?next=/account/orders/statement?year=${year}`);

  const { data: orders } = await sb
    .from("orders")
    .select(`
      id, created_at, status, subtotal, shipping, total, currency,
      delivered_at, dispatched_at, courier, tracking_ref,
      order_items(name, brand_slug, colour, size, qty, unit_price)
    `)
    .eq("customer_id", user.id)
    .gte("created_at", `${year}-01-01T00:00:00Z`)
    .lt("created_at",  `${year + 1}-01-01T00:00:00Z`)
    .order("created_at", { ascending: true });

  type Item = { name: string; brand_slug: string; colour: string | null; size: string; qty: number; unit_price: number };
  type Order = {
    id: string;
    created_at: string;
    status: string;
    subtotal: number;
    shipping: number;
    total: number;
    currency: string;
    delivered_at: string | null;
    dispatched_at: string | null;
    courier: string | null;
    tracking_ref: string | null;
    order_items: Item[];
  };
  const typed = (orders ?? []) as unknown as Order[];

  // Totals — only count statuses that represent money out
  const settledStatuses = new Set(["paid", "packed", "dispatched", "delivered"]);
  const settled  = typed.filter(o => settledStatuses.has(o.status));
  const refunded = typed.filter(o => o.status === "refunded" || o.status === "cancelled");

  const sumSettled = settled.reduce((s, o) => s + o.total, 0);
  const sumRefunds = refunded.reduce((s, o) => s + o.total, 0);
  const currency = typed[0]?.currency ?? "GBP";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .statement-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
        @page { size: A4; margin: 14mm; }
      `}</style>

      <div className="no-print mb-6 flex items-center gap-4 flex-wrap">
        <Link href="/account/orders" className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
          ← Back to orders
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
        <a
          href={`/account/orders/export?year=${year}`}
          className="px-5 py-2 text-[11px] tracking-[0.22em] uppercase font-medium border"
          style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
        >
          Download CSV
        </a>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Tip: Cmd/Ctrl-P → "Save as PDF" produces a clean attachment.
        </span>
      </div>

      <div className="statement-page mx-auto max-w-[210mm] p-12 bg-white" style={{ color: "#000", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <header className="flex items-start justify-between mb-10 pb-6 border-b border-black">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase mb-2">Annual statement · {year}</p>
            <h1 className="text-3xl font-light tracking-tight">ASOFE</h1>
            <p className="text-[10px] mt-1">A trading name of Kadd Consulting Limited</p>
          </div>
          <div className="text-right text-[11px]">
            <p className="text-[10px] uppercase tracking-wider">Issued to</p>
            <p className="font-mono text-sm">{user.email}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider">Generated</p>
            <p>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </header>

        <section className="grid grid-cols-3 gap-8 mb-10 text-[11px] leading-relaxed">
          <SummaryStat k="Orders placed" v={String(typed.length)} />
          <SummaryStat k="Net spend"      v={formatPrice(sumSettled, currency)} />
          <SummaryStat k="Refunded"       v={refunded.length === 0 ? "—" : `${formatPrice(sumRefunds, currency)} (${refunded.length})`} />
        </section>

        {typed.length === 0 ? (
          <p className="text-sm">No orders in {year}.</p>
        ) : (
          <section className="mb-8">
            <p className="text-[10px] uppercase tracking-wider mb-3">Orders</p>
            <ul className="space-y-6">
              {typed.map(o => (
                <li key={o.id} className="border-b border-black/20 pb-5">
                  <div className="flex items-baseline justify-between mb-2 gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">
                        Order {o.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-black/60">
                        {formatDate(o.created_at)} · {ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL] ?? o.status}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums">
                      {formatPrice(o.total, o.currency)}
                    </p>
                  </div>
                  <table className="w-full text-[10px] mt-2">
                    <thead>
                      <tr className="text-black/60 text-[9px] uppercase tracking-wider">
                        <th className="text-left py-1 pr-2 font-medium">Piece</th>
                        <th className="text-left py-1 px-2 font-medium">Designer</th>
                        <th className="text-left py-1 px-2 font-medium">Variant</th>
                        <th className="text-right py-1 px-2 font-medium">Qty</th>
                        <th className="text-right py-1 px-2 font-medium">Unit</th>
                        <th className="text-right py-1 pl-2 font-medium">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.order_items.map((it, idx) => (
                        <tr key={`${o.id}-${idx}`} className="border-t border-black/10">
                          <td className="py-1.5 pr-2">{it.name}</td>
                          <td className="py-1.5 px-2">{it.brand_slug.replace(/-/g, " ")}</td>
                          <td className="py-1.5 px-2">{it.colour ? `${it.colour} · ` : ""}Size {it.size}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{it.qty}</td>
                          <td className="py-1.5 px-2 text-right tabular-nums">{formatPrice(it.unit_price, o.currency)}</td>
                          <td className="py-1.5 pl-2 text-right tabular-nums">{formatPrice(it.unit_price * it.qty, o.currency)}</td>
                        </tr>
                      ))}
                      {o.shipping > 0 && (
                        <tr className="border-t border-black/10">
                          <td colSpan={5} className="py-1.5 text-right text-black/60">Shipping</td>
                          <td className="py-1.5 pl-2 text-right tabular-nums">{formatPrice(o.shipping, o.currency)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {(o.courier || o.tracking_ref) && (
                    <p className="mt-3 text-[10px] text-black/60">
                      {o.courier ?? ""}{o.tracking_ref ? ` · ${o.tracking_ref}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-12 pt-6 border-t border-black/20 text-[9px] text-black/60 leading-relaxed">
          <p>
            This statement is generated from your Asofe account on {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Asofe is a trading name of Kadd Consulting Limited, registered in England and Wales · Company number 15467682 · Registered office 33 Lansbury Road, Newton Leys, Bletchley, Bucks, MK3 5QP. For questions, write to correspondence@theasofe.com.
          </p>
        </footer>
      </div>
    </>
  );
}

function SummaryStat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-black/60 mb-1">{k}</p>
      <p className="text-base tabular-nums">{v}</p>
    </div>
  );
}
