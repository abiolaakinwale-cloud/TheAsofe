import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createBrand } from "./actions";
import ImagePicker from "@/components/admin/ImagePicker";

export default async function AdminBrandsPage() {
  const sb = getAdminSupabase();
  const { data: brands } = await sb.from("brands").select("slug, name, origin, founded").order("name");
  const { data: counts } = await sb.from("products").select("brand");
  const byBrand = new Map<string, number>();
  for (const r of (counts ?? [])) byBrand.set(r.brand, (byBrand.get(r.brand) ?? 0) + 1);

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>The Designers</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {brands?.length ?? 0} brands.
      </h1>

      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
        <section className="lg:col-span-7">
          <h2 className="text-[11px] tracking-[0.18em] uppercase font-medium mb-6" style={{ color: "var(--color-muted)" }}>All brands</h2>
          {(brands ?? []).length === 0 ? (
            <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>No brands yet.</p>
          ) : (
            <ul className="space-y-px">
              {brands!.map(b => (
                <li key={b.slug} className="p-6 grid grid-cols-12 items-center gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                  <div className="col-span-5">
                    <Link href={`/brands/${b.slug}`} className="serif text-xl lux-link" style={{ color: "var(--color-ink)" }}>
                      {b.name}
                    </Link>
                    <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{b.slug}</p>
                  </div>
                  <p className="col-span-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>{b.origin}</p>
                  <p className="col-span-2 text-sm tabular-nums" style={{ color: "var(--color-ink-soft)" }}>{byBrand.get(b.slug) ?? 0} pieces</p>
                  <Link href={`/admin/brands/${b.slug}/edit`} className="col-span-2 text-[10px] tracking-[0.18em] uppercase lux-link text-right" style={{ color: "var(--color-ink)" }}>
                    Edit →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-5">
          <h2 className="text-[11px] tracking-[0.18em] uppercase font-medium mb-6" style={{ color: "var(--color-muted)" }}>Add a brand</h2>
          <form action={createBrand} className="space-y-5 p-8 border" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
            <Field name="slug" label="Slug" placeholder="atelier-name" />
            <Field name="name" label="Brand name" />
            <Field name="tagline" label="Tagline" />
            <Field name="origin" label="Origin (city)" />
            <Field name="founded" label="Founded (year, optional)" />
            <ImagePicker name="hero_image" label="Hero image" folder="brands" />
            <TextArea name="story" label="House story" rows={5} />
            <button type="submit" className="w-full py-3 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
              Create brand
            </button>
          </form>
        </section>
      </div>
    </>
  );
}

function Field({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{label}</span>
      <input
        name={name}
        type="text"
        placeholder={placeholder}
        className="w-full bg-transparent border-b py-2 text-sm outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}
function TextArea({ name, label, rows }: { name: string; label: string; rows: number }) {
  return (
    <label className="block">
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{label}</span>
      <textarea
        name={name}
        rows={rows}
        className="w-full bg-transparent border py-2 px-3 text-sm leading-relaxed outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}
