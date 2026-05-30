import type { Category } from "@/lib/data";
import ImageUploader from "./ImageUploader";

type Defaults = {
  slug?: string;
  name?: string;
  category?: string;
  subcategory?: string | null;
  price?: number;
  colour?: string;
  colours?: string[] | null;
  made_in?: string;
  sizes?: string[];
  composition?: string[];
  images?: string[];
  description?: string;
  published?: boolean;
  new_arrival?: boolean;
  featured?: boolean;
  made_to_order?: boolean;
  lead_time_weeks?: number | null;
};

export default function ProductFields({
  categories,
  brand,
  productSlug,
  d,
}: {
  categories: Category[];
  brand: string;
  productSlug?: string;
  d?: Defaults;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-x-10 gap-y-6">
      <Field name="slug" label="Slug" defaultValue={d?.slug} placeholder="aso-oke-wrap-coat" />
      <Field name="name" label="Name" defaultValue={d?.name} />

      <label className="block">
        <Label>Category</Label>
        <select name="category" defaultValue={d?.category} className="w-full bg-transparent border-b py-2 text-sm" style={{ borderColor: "var(--color-rule)" }}>
          <option value="">Select…</option>
          {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>
      <Field name="subcategory" label="Subcategory (optional)" defaultValue={d?.subcategory ?? ""} placeholder="outerwear" />

      <Field name="price" label="Price (GBP, integer)" defaultValue={d?.price?.toString()} placeholder="2480" inputMode="numeric" />
      <Field name="colour" label="Default colour" defaultValue={d?.colour} />
      <Field
        name="colours"
        label="Variant colours (comma-separated · leave blank for single colour)"
        defaultValue={d?.colours?.join(", ") ?? ""}
        placeholder="Indigo, Black, Sand"
      />
      <Field name="made_in" label="Made in" defaultValue={d?.made_in} placeholder="Nigeria" />
      <Field name="sizes" label="Sizes (comma-separated)" defaultValue={d?.sizes?.join(", ")} placeholder="XS, S, M, L" />
      <Field name="composition" label="Composition (comma-separated)" defaultValue={d?.composition?.join(", ")} placeholder="100% aso oke cotton" />

      <ImageUploader brand={brand} productSlug={productSlug} defaultImages={d?.images} />

      <label className="block lg:col-span-2">
        <Label>Description</Label>
        <textarea
          name="description"
          rows={5}
          defaultValue={d?.description}
          className="w-full bg-transparent border py-2 px-3 text-sm leading-relaxed outline-none focus:border-[var(--color-ink)]"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
      </label>

      <div className="lg:col-span-2 flex flex-wrap gap-x-8 gap-y-3 pt-2">
        <Toggle name="published"      defaultChecked={d?.published ?? true}      label="Published — visible on the public catalogue" />
        <Toggle name="new_arrival"    defaultChecked={d?.new_arrival ?? false}   label="New arrival" />
        <Toggle name="featured"       defaultChecked={d?.featured ?? false}      label="Featured" />
        <Toggle name="made_to_order"  defaultChecked={d?.made_to_order ?? false} label="Made to order (allow backorder when out of stock)" />
      </div>

      <Field
        name="lead_time_weeks"
        label="Lead time (weeks) — only when made to order"
        defaultValue={d?.lead_time_weeks?.toString() ?? ""}
        placeholder="3"
        inputMode="numeric"
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{children}</span>;
}

function Field({ name, label, defaultValue, placeholder, inputMode }: { name: string; label: string; defaultValue?: string; placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full bg-transparent border-b py-2 text-sm outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}

function Toggle({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  return (
    <label className="inline-flex items-center gap-3 text-sm" style={{ color: "var(--color-ink)" }}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4" />
      {label}
    </label>
  );
}
