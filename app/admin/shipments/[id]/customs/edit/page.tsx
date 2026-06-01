import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { defaultHsCode, defaultOrigin } from "@/lib/customs";
import { saveCustomsMetadata } from "./actions";

const INCOTERMS = [
  { code: "DDP", label: "DDP — Delivered Duty Paid (we handle import VAT)" },
  { code: "DAP", label: "DAP — Delivered At Place (consignee pays import duty)" },
  { code: "EXW", label: "EXW — Ex Works (buyer collects from designer)" },
  { code: "FOB", label: "FOB — Free On Board" },
  { code: "CIF", label: "CIF — Cost, Insurance, Freight" },
];

export default async function EditCustomsMetadataPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();

  const { data: shipment } = await sb
    .from("shipments")
    .select("*, brands:brand(name, origin)")
    .eq("id", id)
    .maybeSingle();
  if (!shipment) notFound();

  const { data: items } = await sb
    .from("shipment_items")
    .select("id, product_slug, size, qty, hs_code, declared_unit_value, country_of_origin, weight_grams, customs_description, products:product_slug(name, category, price)")
    .eq("shipment_id", id);

  type Row = {
    id: string;
    product_slug: string;
    size: string;
    qty: number;
    hs_code: string | null;
    declared_unit_value: number | null;
    country_of_origin: string | null;
    weight_grams: number | null;
    customs_description: string | null;
    products: { name: string; category: string; price: number } | null;
  };
  const rows = (items as unknown as Row[]) ?? [];
  const originDefault = defaultOrigin(shipment.brand);

  return (
    <>
      <Link href={`/admin/shipments/${id}/customs`} className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Customs declaration
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Edit customs metadata</p>
      <h1 className="display text-4xl lg:text-5xl mb-4" style={{ color: "var(--color-ink)" }}>
        Refine the declaration.
      </h1>
      <p className="text-sm mb-12 max-w-2xl leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        Defaults are derived from the catalogue (HS code from product category, origin from the designer&apos;s country, declared value from the retail price). Override anything that needs to be more specific for the broker / HMRC. Blank = use the default.
      </p>

      <form action={saveCustomsMetadata} className="space-y-12 max-w-5xl">
        <input type="hidden" name="shipmentId" value={id} />

        {/* ─── Shipment-level ────────────────────────────────────── */}
        <section>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Shipment header</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <label className="block">
              <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Invoice number</span>
              <input
                name="invoice_number"
                type="text"
                defaultValue={shipment.invoice_number ?? ""}
                placeholder="ASF-2026-XXXX (auto if blank)"
                className="w-full h-11 border bg-transparent px-3 text-base font-mono"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              />
            </label>
            <label className="block">
              <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Incoterm</span>
              <select
                name="incoterm"
                defaultValue={shipment.incoterm ?? "DDP"}
                className="w-full h-11 border bg-transparent px-3 text-base"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              >
                {INCOTERMS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Commercial purpose</span>
              <input
                name="commercial_purpose"
                type="text"
                defaultValue={shipment.commercial_purpose ?? "Sale of goods"}
                placeholder="Sale of goods"
                className="w-full h-11 border bg-transparent px-3 text-base"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Consignor (designer) address</span>
              <textarea
                name="consignor_address"
                rows={3}
                defaultValue={shipment.consignor_address ?? ""}
                placeholder="Designer&apos;s pickup address — appears in the Shipper block of the commercial invoice"
                className="w-full border bg-transparent p-3 text-base leading-relaxed"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              />
            </label>
          </div>
        </section>

        {/* ─── Per-item ─────────────────────────────────────────── */}
        <section>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Line items ({rows.length})</h2>
          <p className="text-xs mb-6" style={{ color: "var(--color-muted)" }}>
            Enter declared unit value in GBP (£42.50 — not pence). Weight in grams per piece. Country in ISO-2 (e.g. NG for Nigeria, GH for Ghana).
          </p>
          <ul className="space-y-6">
            {rows.map(r => {
              const hsDefault     = defaultHsCode(r.products?.category);
              const valueDefault  = r.products?.price ?? null;
              return (
                <li key={r.id} className="p-5" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                  <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                        {r.products?.name ?? r.product_slug}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                        Size {r.size} · Qty {r.qty} · {r.products?.category}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <LineField label="HS code" hint={hsDefault ? `default ${hsDefault.code}` : undefined}>
                      <input
                        name={`hs__${r.id}`}
                        type="text"
                        defaultValue={r.hs_code ?? ""}
                        placeholder={hsDefault?.code ?? "6-10 digits"}
                        className="w-full h-10 border bg-transparent px-2 text-sm font-mono"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                      />
                    </LineField>
                    <LineField label="Unit value (£)" hint={valueDefault !== null ? `default £${valueDefault.toFixed(2)}` : undefined}>
                      <input
                        name={`value__${r.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={r.declared_unit_value !== null ? (r.declared_unit_value / 100).toFixed(2) : ""}
                        placeholder={valueDefault !== null ? valueDefault.toFixed(2) : "0.00"}
                        className="w-full h-10 border bg-transparent px-2 text-sm tabular-nums"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                      />
                    </LineField>
                    <LineField label="Country (ISO-2)" hint={originDefault ? `default ${originDefault.iso}` : undefined}>
                      <input
                        name={`origin__${r.id}`}
                        type="text"
                        maxLength={2}
                        defaultValue={r.country_of_origin ?? ""}
                        placeholder={originDefault?.iso ?? "GB"}
                        className="w-full h-10 border bg-transparent px-2 text-sm uppercase tracking-wider"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                      />
                    </LineField>
                    <LineField label="Weight (g/piece)" hint="no default">
                      <input
                        name={`weight__${r.id}`}
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={r.weight_grams ?? ""}
                        placeholder="e.g. 850"
                        className="w-full h-10 border bg-transparent px-2 text-sm tabular-nums"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                      />
                    </LineField>
                  </div>

                  <LineField label="Customs description" hint="defaults to product name + composition; broker may want plainer language">
                    <input
                      name={`desc__${r.id}`}
                      type="text"
                      defaultValue={r.customs_description ?? ""}
                      placeholder={r.products?.name ?? ""}
                      className="w-full h-10 border bg-transparent px-2 text-sm mt-2"
                      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                    />
                  </LineField>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button
            type="submit"
            className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Save customs metadata
          </button>
          <Link href={`/admin/shipments/${id}/customs`} className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

function LineField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between mb-1.5 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
        <span>{label}</span>
        {hint && <span className="text-[9px] tracking-[0.12em] normal-case font-normal" style={{ color: "var(--color-muted)" }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}
