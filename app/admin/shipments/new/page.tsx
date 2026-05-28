import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createShipment } from "../actions";

export default async function NewShipmentPage() {
  const sb = getAdminSupabase();
  const { data: brands } = await sb.from("brands").select("slug, name").order("name");

  return (
    <>
      <Link href="/admin/shipments" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← All consignments
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>New consignment</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>Log a Lagos shipment.</h1>

      <form action={createShipment} className="space-y-6 max-w-2xl">
        <label className="block">
          <Label>Designer</Label>
          <select name="brand" required className="w-full bg-transparent border-b py-2 text-sm" style={{ borderColor: "var(--color-rule)" }}>
            <option value="">Select…</option>
            {(brands ?? []).map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        </label>

        <div className="grid sm:grid-cols-2 gap-x-10 gap-y-6">
          <Field name="freight_partner"  label="Freight partner (optional)"  placeholder="DHL Lagos" />
          <Field name="tracking_ref"     label="Tracking reference (optional)" />
          <label className="block">
            <Label>Expected arrival (optional)</Label>
            <input name="expected_arrival" type="date" className="w-full bg-transparent border-b py-2 text-sm" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }} />
          </label>
        </div>

        <label className="block">
          <Label>Notes (optional)</Label>
          <textarea name="notes" rows={4} className="w-full bg-transparent border py-2 px-3 text-sm leading-relaxed" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }} />
        </label>

        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
          After creating, you'll add line items (product, size, quantity) on the consignment's detail page.
        </p>

        <div className="pt-4">
          <button type="submit" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Create consignment
          </button>
        </div>
      </form>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{children}</span>;
}
function Field({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input name={name} type="text" placeholder={placeholder} className="w-full bg-transparent border-b py-2 text-sm outline-none focus:border-[var(--color-ink)]" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }} />
    </label>
  );
}
