import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import ImagePicker from "@/components/admin/ImagePicker";
import { updateBrand } from "../../actions";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sb = getAdminSupabase();
  const { data: brand } = await sb
    .from("brands")
    .select("slug, name, tagline, founded, origin, story, hero_image")
    .eq("slug", slug)
    .maybeSingle();
  if (!brand) notFound();

  return (
    <>
      <Link href="/admin/brands" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Back to designers
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>Edit designer</p>
      <h1 className="display text-4xl lg:text-5xl mb-2" style={{ color: "var(--color-ink)" }}>
        {brand.name}.
      </h1>
      <p className="text-sm mb-12 font-mono" style={{ color: "var(--color-muted)" }}>{brand.slug}</p>

      <form action={updateBrand.bind(null, brand.slug)} className="space-y-5 max-w-3xl">
        <Field name="name"    label="Brand name"             defaultValue={brand.name} />
        <Field name="tagline" label="Tagline"                defaultValue={brand.tagline} />
        <Field name="origin"  label="Origin (city)"          defaultValue={brand.origin} />
        <Field name="founded" label="Founded (year, optional)" defaultValue={brand.founded === "—" ? "" : brand.founded} />
        <ImagePicker name="hero_image" label="Hero image" folder="brands" defaultValue={brand.hero_image} full />
        <TextArea name="story" label="House story" rows={6} defaultValue={brand.story} />

        <div className="flex flex-wrap gap-4 pt-4">
          <button type="submit" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Save changes
          </button>
          <Link href="/admin/brands" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="w-full bg-transparent border-b py-2 text-sm outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}

function TextArea({ name, label, rows, defaultValue }: { name: string; label: string; rows: number; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="w-full bg-transparent border py-2 px-3 text-sm leading-relaxed outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}
