import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/account";
import { submitReturnForm } from "./actions";

const RETURN_WINDOW_DAYS = 7;

const REASONS: Array<{ value: string; label: string }> = [
  { value: "sizing",            label: "Wrong size" },
  { value: "quality",           label: "Quality below expectation" },
  { value: "not_as_described",  label: "Not as described / pictured" },
  { value: "arrived_damaged",   label: "Arrived damaged" },
  { value: "wrong_item",        label: "Wrong item sent" },
  { value: "changed_mind",      label: "Changed my mind" },
  { value: "other",             label: "Other (please note below)" },
];

export default async function RequestReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signin?next=/account/orders/${id}/return`);

  const { data: order } = await sb
    .from("orders")
    .select("id, status, updated_at, customer_email")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const { data: items } = await sb
    .from("order_items")
    .select("id, name, colour, size, qty, unit_price, brand_slug, currency:order_id")
    .eq("order_id", id);

  const { data: existing } = await sb
    .from("returns")
    .select("id, status, rma_number")
    .eq("order_id", id)
    .in("status", ["requested", "approved", "received"])
    .maybeSingle();

  const ineligible = (() => {
    if (existing) return { kind: "existing" as const, returnId: existing.id, rma: existing.rma_number };
    if (order.status !== "delivered" && order.status !== "dispatched") {
      return { kind: "status" as const };
    }
    const ageDays = (Date.now() - new Date(order.updated_at).getTime()) / 86_400_000;
    if (ageDays > RETURN_WINDOW_DAYS) return { kind: "expired" as const };
    return null;
  })();

  return (
    <>
      <Link href={`/account/orders/${id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Order {id.slice(0, 8)}
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Returns</p>
      <h1 className="display text-4xl lg:text-5xl mb-4" style={{ color: "var(--color-ink)" }}>
        Request a return.
      </h1>
      <p className="serif italic text-lg mb-10 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
        Complimentary returns within {RETURN_WINDOW_DAYS} days of delivery. Pieces must be unworn and in their original packaging.
      </p>

      {ineligible?.kind === "existing" && (
        <div className="max-w-2xl p-6 border" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--color-ink)" }}>
            A return for this order is already in progress.
          </p>
          <Link href={`/account/returns/${ineligible.returnId}`} className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-oxblood)" }}>
            View return {ineligible.rma} →
          </Link>
        </div>
      )}

      {ineligible?.kind === "status" && (
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Returns become available once your order has been dispatched. Current status: <em className="serif italic">{order.status}</em>.
        </p>
      )}

      {ineligible?.kind === "expired" && (
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          The {RETURN_WINDOW_DAYS}-day return window has closed for this order. Write to{" "}
          <a className="lux-link" href="mailto:correspondence@theasofe.com">correspondence@theasofe.com</a>{" "}
          if you believe there&apos;s a quality issue.
        </p>
      )}

      {!ineligible && items && items.length > 0 && (
        <form action={submitReturnForm} className="space-y-10 max-w-3xl">
          <input type="hidden" name="orderId" value={id} />

          {error && (
            <p className="p-4 text-sm" style={{ color: "var(--color-oxblood)", backgroundColor: "var(--color-cream)" }}>
              {decodeURIComponent(error)}
            </p>
          )}

          <section>
            <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Pieces to return</h2>
            <ul className="space-y-px">
              {items.map(it => (
                <li key={it.id} className="grid grid-cols-12 gap-4 p-5 items-center" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                  <div className="col-span-7 lg:col-span-8">
                    <p className="text-sm tracking-[0.10em] uppercase" style={{ color: "var(--color-ink)" }}>{it.name}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                      {it.brand_slug.replace(/-/g, " ")}{it.colour ? ` · ${it.colour}` : ""} · Size {it.size} · Bought {it.qty}
                    </p>
                  </div>
                  <div className="col-span-5 lg:col-span-4 flex items-center justify-end gap-3">
                    <label className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Return qty</label>
                    <select
                      name={`qty__${it.id}`}
                      defaultValue="0"
                      className="w-20 h-11 border bg-transparent text-base text-center tabular-nums"
                      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                    >
                      {Array.from({ length: it.qty + 1 }, (_, i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <label className="block">
              <span className="block mb-3 eyebrow" style={{ color: "var(--color-emerald)" }}>Reason</span>
              <select
                name="reason"
                required
                defaultValue=""
                className="w-full h-12 border bg-transparent px-3 text-base"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              >
                <option value="" disabled>Pick a reason…</option>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
          </section>

          <section>
            <label className="block">
              <span className="block mb-3 eyebrow" style={{ color: "var(--color-emerald)" }}>Anything to add? (optional)</span>
              <textarea
                name="customerNote"
                rows={4}
                placeholder="e.g. the colour is darker than the photographs"
                className="w-full border bg-transparent p-3 text-base"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              />
            </label>
          </section>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              type="submit"
              className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
            >
              Submit return request
            </button>
            <Link href={`/account/orders/${id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
