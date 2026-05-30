import Link from "next/link";
import type { Subcategory } from "@/lib/subcategories";

type Props = {
  category: string;
  categoryName: string;
  subcategories: Subcategory[];
  active?: string | null;
};

export default function SubcategoryNav({ category, categoryName, subcategories, active = null }: Props) {
  if (subcategories.length === 0) return null;

  return (
    <nav className="border-b" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-4 flex flex-wrap items-center gap-x-7 gap-y-2 text-[11px] tracking-[0.14em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
        <Link
          href={`/${category}`}
          className="lux-link"
          style={{
            color: active === null ? "var(--color-ink)" : "var(--color-muted)",
            borderBottom: active === null ? "1px solid var(--color-ink)" : undefined,
            paddingBottom: active === null ? "2px" : undefined,
          }}
        >
          All {categoryName}
        </Link>
        {subcategories.map(s => (
          <Link
            key={s.slug}
            href={`/${category}/${s.slug}`}
            className="lux-link"
            style={{
              color: active === s.slug ? "var(--color-ink)" : "var(--color-muted)",
              borderBottom: active === s.slug ? "1px solid var(--color-ink)" : undefined,
              paddingBottom: active === s.slug ? "2px" : undefined,
            }}
          >
            {s.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
