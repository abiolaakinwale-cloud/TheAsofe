import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  addShipmentItem,
  inductShipment,
  removeShipmentItem,
  setShipmentStatus,
} from "../actions";

const NEXT_STATES: Record<string, { label: string; to: "in_transit" | "customs" | "arrived" | "cancelled" }[]> = {
  awaiting_dispatch: [{ label: "Mark in transit", to: "in_transit" }, { label: "Cancel", to: "cancelled" }],
  in_transit:        [{ label: "Mark at customs", to: "customs" },    { label: "Cancel", to: "cancelled" }],
  customs:           [{ label: "Mark arrived",    to: "arrived" }],
  arrived:           [],
  inducted:          [],
  cancelled:         [],
};

export default async function AdminShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();
  const [{ data: shipment }, { data: items }, { data: brandProducts }] = await Promise.all([
    sb.from("shipments").select("*").eq("id", id).maybeSingle(),
    sb.from("shipment_items").select("id, product_slug, size, qty, received_qty").eq("shipment_id", id).order("product_slug"),
    sb.from("products").select("slug, name, sizes").order("name"),
  ]);
  if (!shipment) notFound();

  const productsForBrand = (brandProducts ?? []).filter((p) => {
    return true; // we don't restrict by brand for the dropdown; admin discretion
  });

  const productNameBySlug = new Map((brandProducts ?? []).map(p => [p.slug, p.name]));
  const transitions = NEXT_STATES[shipment.status] ?? [];
  const canInduct = shipment.status === "arrived" || shipment.status === "customs" || shipment.status === "in_transit";

  return (
    <>
      <Link href="/admin/shipments" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← All consignments
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Consignment</p>
      <h1 className="display text-4xl lg:text-5xl mb-2 tabular-nums" style={{ color: "var(--color-ink)" }}>
        #{shipment.id.slice(0, 8).toUpperCase()}
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        {shipment.brand} · status: <strong style={{ color: "var(--color-ink)" }}>{shipment.status.replace(/_/g, " ")}</strong>
        {shipment.expected_arrival && <> · ETA {shipment.expected_arrival}</>}
        {shipment.tracking_ref && <> · {shipment.tracking_ref}</>}
      </p>

      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
        {/* ─── Items ───────────────────────────────────────────── */}
        <section className="lg:col-span-8">
          <h2 className="text-[11px] tracking-[0.18em] uppercase font-medium mb-6" style={{ color: "var(--color-muted)" }}>Line items</h2>

          {(items ?? []).length === 0 ? (
            <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>No line items yet. Add the first.</p>
          ) : (
            <form action={inductShipment.bind(null, shipment.id)}>
              <ul className="space-y-px mb-8">
                {items!.map(it => (
                  <li key={it.id} className="p-5 grid grid-cols-12 gap-4 items-center" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                    <p className="col-span-12 lg:col-span-5 serif text-lg" style={{ color: "var(--color-ink)" }}>
                      {productNameBySlug.get(it.product_slug) ?? it.product_slug}
                    </p>
                    <p className="col-span-3 lg:col-span-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>size {it.size}</p>
                    <p className="col-span-3 lg:col-span-2 text-sm tabular-nums" style={{ color: "var(--color-ink-soft)" }}>{it.qty} planned</p>
                    <div className="col-span-4 lg:col-span-2">
                      {canInduct ? (
                        <input
                          type="number"
                          name={`received__${it.id}`}
                          min={0}
                          defaultValue={it.received_qty ?? it.qty}
                          className="w-full bg-transparent border-b py-1 text-right text-sm tabular-nums"
                          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                        />
                      ) : (
                        <p className="text-sm tabular-nums text-right" style={{ color: "var(--color-muted)" }}>
                          {it.received_qty ?? "—"}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 lg:col-span-1 flex justify-end">
                      {shipment.status !== "inducted" && (
                        <form action={removeShipmentItem.bind(null, shipment.id, it.id)}>
                          <button type="submit" className="text-[10px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
                            Remove
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {canInduct && (
                <div className="p-6 mb-12" style={{ backgroundColor: "var(--color-cream)" }}>
                  <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>Induct into UK stock</p>
                  <p className="text-sm leading-relaxed mb-5 max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
                    Set the received quantity per size above, then induct. The pieces will be added to live stock and the seller will be notified.
                  </p>
                  <button type="submit" className="px-8 py-3 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-emerald)", color: "var(--color-ground)" }}>
                    Induct into stock
                  </button>
                </div>
              )}
            </form>
          )}

          {shipment.status !== "inducted" && shipment.status !== "cancelled" && (
            <>
              <h3 className="text-[11px] tracking-[0.18em] uppercase font-medium mb-4 mt-12" style={{ color: "var(--color-muted)" }}>Add a line</h3>
              <form action={addShipmentItem.bind(null, shipment.id)} className="grid grid-cols-12 gap-3 items-end max-w-2xl">
                <label className="col-span-6 block">
                  <Label>Product</Label>
                  <select name="product_slug" required className="w-full bg-transparent border-b py-2 text-sm" style={{ borderColor: "var(--color-rule)" }}>
                    <option value="">Select…</option>
                    {productsForBrand.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                  </select>
                </label>
                <label className="col-span-3 block">
                  <Label>Size</Label>
                  <input name="size" type="text" required placeholder="M" className="w-full bg-transparent border-b py-2 text-sm" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }} />
                </label>
                <label className="col-span-2 block">
                  <Label>Qty</Label>
                  <input name="qty" type="number" min={1} required defaultValue={1} className="w-full bg-transparent border-b py-2 text-sm text-right" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }} />
                </label>
                <button type="submit" className="col-span-1 py-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
                  Add
                </button>
              </form>
            </>
          )}
        </section>

        {/* ─── Status panel ────────────────────────────────────── */}
        <aside className="lg:col-span-4 space-y-8">
          {transitions.length > 0 && (
            <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <p className="eyebrow mb-4" style={{ color: "var(--color-saffron)" }}>Move forward</p>
              <div className="flex flex-col gap-2">
                {transitions.map(t => (
                  <form key={t.to} action={setShipmentStatus.bind(null, shipment.id, t.to)}>
                    <button type="submit" className="w-full py-3 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ backgroundColor: t.to === "cancelled" ? "var(--color-oxblood)" : "var(--color-ink)", color: "var(--color-ground)" }}>
                      {t.label}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}

          <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
            <p className="eyebrow mb-3" style={{ color: "var(--color-cobalt)" }}>Logistics</p>
            <dl className="space-y-2 text-sm">
              <Row k="Freight" v={shipment.freight_partner ?? "—"} />
              <Row k="Tracking" v={shipment.tracking_ref ?? "—"} />
              <Row k="ETA" v={shipment.expected_arrival ?? "—"} />
              <Row k="Received" v={shipment.received_at ? new Date(shipment.received_at).toLocaleString() : "—"} />
            </dl>
          </div>

          {shipment.notes && (
            <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <p className="eyebrow mb-3" style={{ color: "var(--color-muted)" }}>Notes</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>{shipment.notes}</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{children}</span>;
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className="text-right" style={{ color: "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}
