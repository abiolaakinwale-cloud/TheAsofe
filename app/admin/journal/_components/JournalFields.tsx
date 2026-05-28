import type { ReactNode } from "react";
import ImagePicker from "@/components/admin/ImagePicker";

type Defaults = {
  slug?: string;
  title?: string;
  eyebrow?: string | null;
  excerpt?: string | null;
  body?: string;
  hero_image?: string;
  brand?: string | null;
  published?: boolean;
};

export default function JournalFields({ brands, d }: { brands: { slug: string; name: string }[]; d?: Defaults }) {
  return (
    <div className="grid lg:grid-cols-2 gap-x-10 gap-y-6">
      <Text name="slug"       label="Slug"             defaultValue={d?.slug} placeholder="correspondence-adunni" />
      <Text name="eyebrow"    label="Eyebrow"          defaultValue={d?.eyebrow ?? ""} placeholder="The Journal · No. 32" />
      <Text name="title"      label="Title"            defaultValue={d?.title} full />
      <ImagePicker name="hero_image" label="Hero image" folder="journal-posts" defaultValue={d?.hero_image} full />
      <Text name="excerpt"    label="Excerpt (one line, shown on the index)" defaultValue={d?.excerpt ?? ""} full />

      <label className="block">
        <Label>Brand (optional)</Label>
        <select name="brand" defaultValue={d?.brand ?? ""} className="w-full bg-transparent border-b py-2 text-sm" style={{ borderColor: "var(--color-rule)" }}>
          <option value="">—</option>
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </label>

      <label className="inline-flex items-center gap-3 text-sm self-end pb-1.5" style={{ color: "var(--color-ink)" }}>
        <input type="checkbox" name="published" defaultChecked={d?.published ?? false} className="w-4 h-4" />
        Publish — visible at /editorial
      </label>

      <label className="block lg:col-span-2">
        <Label>Body</Label>
        <p className="text-xs mb-2" style={{ color: "var(--color-muted)" }}>
          Plain text. Paragraphs are separated by a blank line.
        </p>
        <textarea
          name="body"
          rows={14}
          defaultValue={d?.body}
          className="w-full bg-transparent border py-3 px-4 text-sm leading-relaxed outline-none focus:border-[var(--color-ink)]"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
      </label>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{children}</span>;
}

function Text({ name, label, defaultValue, placeholder, full }: { name: string; label: string; defaultValue?: string; placeholder?: string; full?: boolean }) {
  return (
    <label className={full ? "block lg:col-span-2" : "block"}>
      <Label>{label}</Label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-transparent border-b py-2 text-sm outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}
