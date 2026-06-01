import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { defaultHsCode, defaultOrigin, generateInvoiceNumber } from "@/lib/customs";

// Print-friendly Commercial Invoice / Customs Declaration.
// Renders as a single-page A4 document — designer prints to PDF and attaches
// to the consignment.
export default async function CustomsDeclarationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();

  const { data: shipment } = await sb
    .from("shipments")
    .select("*, brands:brand(name, origin, story)")
    .eq("id", id)
    .maybeSingle();
  if (!shipment) notFound();

  const { data: items } = await sb
    .from("shipment_items")
    .select("id, product_slug, size, qty, hs_code, declared_unit_value, country_of_origin, weight_grams, customs_description, products:product_slug(name, category, made_in, composition, price)")
    .eq("shipment_id", id);

  type ItemRow = {
    id: string;
    product_slug: string;
    size: string;
    qty: number;
    hs_code: string | null;
    declared_unit_value: number | null;
    country_of_origin: string | null;
    weight_grams: number | null;
    customs_description: string | null;
    products: { name: string; category: string; made_in: string; composition: string[]; price: number } | null;
  };
  const rows = (items as unknown as ItemRow[]) ?? [];

  const brand = shipment.brands as { name: string; origin: string; story: string } | null;
  const invoiceNumber = shipment.invoice_number ?? generateInvoiceNumber(shipment.id);
  const defaultOriginInfo = defaultOrigin(shipment.brand);

  let totalDeclared = 0;
  let totalWeight = 0;
  for (const r of rows) {
    const unitVal = r.declared_unit_value ?? (r.products?.price ?? 0) * 100;       // pence
    totalDeclared += unitVal * r.qty;
    totalWeight   += (r.weight_grams ?? 0) * r.qty;
  }

  return (
    <>
      {/* Print-only stylesheet — strips chrome, fits A4 */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
        @page { size: A4; margin: 14mm; }
      `}</style>

      <div className="no-print mb-6 flex items-center gap-4 flex-wrap">
        <Link href={`/admin/shipments/${id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
          ← Back to shipment
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
        <Link
          href={`/admin/shipments/${id}/customs/edit`}
          className="px-5 py-2 text-[11px] tracking-[0.22em] uppercase font-medium border"
          style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
        >
          Edit metadata →
        </Link>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Tip: Cmd/Ctrl-P → "Save as PDF" produces a clean attachment.
        </span>
      </div>

      <div className="invoice-page mx-auto max-w-[210mm] p-12 bg-white" style={{ color: "#000", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {/* Header */}
        <header className="flex items-start justify-between mb-10 pb-6 border-b border-black">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase mb-2">Commercial Invoice</p>
            <h1 className="text-3xl font-light tracking-tight">ASOFE</h1>
            <p className="text-[10px] mt-1">A trading name of Kadd Consulting Limited</p>
          </div>
          <div className="text-right text-[11px]">
            <p className="mb-1"><span className="text-[10px] uppercase tracking-wider">Invoice no.</span></p>
            <p className="font-mono text-base mb-3">{invoiceNumber}</p>
            <p className="text-[10px] uppercase tracking-wider">Date</p>
            <p>{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </header>

        {/* Parties */}
        <section className="grid grid-cols-2 gap-12 mb-10 text-[11px] leading-relaxed">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-2">Shipper (Exporter)</p>
            <p className="font-medium text-sm mb-1">{brand?.name ?? shipment.brand}</p>
            {brand?.origin && <p>{brand.origin}</p>}
            {shipment.consignor_address && <p className="whitespace-pre-line">{shipment.consignor_address}</p>}
            {defaultOriginInfo && <p className="mt-2">Country of export: {defaultOriginInfo.name} ({defaultOriginInfo.iso})</p>}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-2">Consignee (Importer)</p>
            <p className="font-medium text-sm mb-1">Kadd Consulting Limited</p>
            <p>(trading as Asofe)</p>
            <p>33 Lansbury Road</p>
            <p>Newton Leys, Bletchley</p>
            <p>Buckinghamshire, MK3 5QP</p>
            <p>United Kingdom</p>
            <p className="mt-2">Company No. 15467682</p>
          </div>
        </section>

        {/* Shipment metadata */}
        <section className="grid grid-cols-4 gap-8 mb-10 text-[10px] leading-relaxed">
          <Meta k="Freight partner" v={shipment.freight_partner ?? "—"} />
          <Meta k="Tracking ref" v={shipment.tracking_ref ?? "—"} />
          <Meta k="Incoterm" v={shipment.incoterm ?? "DDP"} />
          <Meta k="Purpose" v={shipment.commercial_purpose ?? "Sale of goods"} />
        </section>

        {/* Line items */}
        <section className="mb-8">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-2 pr-2 text-[9px] uppercase tracking-wider font-medium">Description</th>
                <th className="text-left py-2 px-2 text-[9px] uppercase tracking-wider font-medium">HS code</th>
                <th className="text-left py-2 px-2 text-[9px] uppercase tracking-wider font-medium">Origin</th>
                <th className="text-right py-2 px-2 text-[9px] uppercase tracking-wider font-medium">Qty</th>
                <th className="text-right py-2 px-2 text-[9px] uppercase tracking-wider font-medium">Weight (g)</th>
                <th className="text-right py-2 px-2 text-[9px] uppercase tracking-wider font-medium">Unit value</th>
                <th className="text-right py-2 pl-2 text-[9px] uppercase tracking-wider font-medium">Line total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const hsFromCategory = defaultHsCode(r.products?.category);
                const hs = r.hs_code ?? hsFromCategory?.code ?? "—";
                const origin = r.country_of_origin ?? defaultOriginInfo?.iso ?? "—";
                const unitValue = r.declared_unit_value ?? (r.products?.price ?? 0) * 100; // pence
                const lineTotal = unitValue * r.qty;
                const desc = r.customs_description
                  ?? (r.products
                      ? `${r.products.name} — ${(r.products.composition ?? []).join(", ") || hsFromCategory?.description || "Apparel"}`
                      : r.product_slug);
                return (
                  <tr key={r.id} className="border-b border-black/10">
                    <td className="py-2 pr-2 align-top">
                      <p className="leading-snug">{desc}</p>
                      <p className="text-[9px] text-black/60 mt-1">Size {r.size} · SKU {r.product_slug}</p>
                    </td>
                    <td className="py-2 px-2 align-top font-mono">{hs}</td>
                    <td className="py-2 px-2 align-top">{origin}</td>
                    <td className="py-2 px-2 align-top text-right tabular-nums">{r.qty}</td>
                    <td className="py-2 px-2 align-top text-right tabular-nums">{r.weight_grams ?? "—"}</td>
                    <td className="py-2 px-2 align-top text-right tabular-nums">£{(unitValue / 100).toFixed(2)}</td>
                    <td className="py-2 pl-2 align-top text-right tabular-nums">£{(lineTotal / 100).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black">
                <td colSpan={3} className="py-3 text-[10px] uppercase tracking-wider font-medium">Total declared value</td>
                <td className="py-3 text-right tabular-nums text-[10px]">{rows.reduce((s, r) => s + r.qty, 0)} pcs</td>
                <td className="py-3 text-right tabular-nums text-[10px]">{totalWeight > 0 ? `${totalWeight} g` : "—"}</td>
                <td className="py-3" />
                <td className="py-3 text-right font-medium tabular-nums text-sm">£{(totalDeclared / 100).toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="py-1 text-[10px] uppercase tracking-wider text-black/60">Currency</td>
                <td colSpan={2} className="py-1 text-right text-[10px]">GBP (Pounds Sterling)</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Declaration */}
        <section className="mb-8 text-[10px] leading-relaxed">
          <p className="text-[10px] uppercase tracking-wider mb-3">Declaration</p>
          <p className="mb-3">
            I declare that the information given on this invoice is true and correct, and that the contents of this consignment
            are as stated. The goods described above are of the origin and value declared, and are exported in accordance with
            applicable laws and regulations.
          </p>
          <p className="mb-3">
            All goods are new, unworn, and exported by the originating designer for retail sale through Asofe (a trading name
            of Kadd Consulting Limited) in the United Kingdom. No prohibited or restricted articles are included.
          </p>
        </section>

        {/* Signature blocks */}
        <section className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-black/30 text-[10px]">
          <div>
            <p className="uppercase tracking-wider mb-12">Signed (Shipper)</p>
            <div className="border-b border-black/60 pb-1 mb-1" style={{ minHeight: "30px" }}></div>
            <p>Name &amp; date</p>
          </div>
          <div>
            <p className="uppercase tracking-wider mb-12">Signed (Consignee — for receipt)</p>
            <div className="border-b border-black/60 pb-1 mb-1" style={{ minHeight: "30px" }}></div>
            <p>Asofe UK · Name &amp; date</p>
          </div>
        </section>

        <footer className="mt-12 pt-6 border-t border-black/20 text-[9px] text-black/60 leading-relaxed">
          <p>
            Asofe is a trading name of Kadd Consulting Limited, registered in England and Wales · Company number 15467682 ·
            Registered office 33 Lansbury Road, Newton Leys, Bletchley, Bucks, MK3 5QP, United Kingdom.
          </p>
        </footer>
      </div>
    </>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-black/60 mb-1">{k}</p>
      <p>{v}</p>
    </div>
  );
}
