"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import type { Brand } from "@/lib/data";
import {
  type Filters,
  type SortKey,
  serializeFilters,
  SORT_OPTIONS,
  activeFilterCount,
} from "@/lib/filters";

type Props = {
  brands: Brand[];          // brands represented in this category
  sizes: string[];          // sizes represented in this category
  priceBounds: { min: number; max: number };
  current: Filters;
  totalCount: number;
  visibleCount: number;
};

export default function CategoryFilters({ brands, sizes, priceBounds, current, totalCount, visibleCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState<null | "brand" | "size" | "price">(null);

  function apply(next: Filters) {
    const params = serializeFilters(next);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function toggle<K extends "brands" | "sizes">(key: K, value: string) {
    const list = current[key] as string[];
    const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
    apply({ ...current, [key]: next });
  }

  function clearAll() {
    const next: Filters = { ...current, brands: [], sizes: [], priceMin: null, priceMax: null, newOnly: false };
    apply(next);
  }

  function setSort(sort: SortKey) {
    apply({ ...current, sort });
  }

  function setNewOnly(v: boolean) {
    apply({ ...current, newOnly: v });
  }

  function setPriceBounds(min: number | null, max: number | null) {
    apply({ ...current, priceMin: min, priceMax: max });
  }

  const activeCount = activeFilterCount(current);

  return (
    <div className="border-b" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-5 flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] tracking-[0.14em] uppercase font-medium relative" style={{ color: "var(--color-ink)" }}>
          <li><span style={{ color: "var(--color-muted)" }}>Refine —</span></li>

          {brands.length > 0 && (
            <li className="relative">
              <button type="button" onClick={() => setOpen(open === "brand" ? null : "brand")} className="lux-link" aria-expanded={open === "brand"}>
                Brand{current.brands.length > 0 && ` (${current.brands.length})`}
              </button>
              {open === "brand" && (
                <Dropdown onClose={() => setOpen(null)}>
                  {brands.map(b => (
                    <CheckRow
                      key={b.slug}
                      label={b.name}
                      checked={current.brands.includes(b.slug)}
                      onChange={() => toggle("brands", b.slug)}
                    />
                  ))}
                </Dropdown>
              )}
            </li>
          )}

          <li className="relative">
            <button type="button" onClick={() => setOpen(open === "price" ? null : "price")} className="lux-link" aria-expanded={open === "price"}>
              Price{(current.priceMin !== null || current.priceMax !== null) && " ·"}
            </button>
            {open === "price" && (
              <Dropdown onClose={() => setOpen(null)} width="w-72">
                <PriceRange
                  bounds={priceBounds}
                  min={current.priceMin}
                  max={current.priceMax}
                  onApply={(min, max) => { setPriceBounds(min, max); setOpen(null); }}
                />
              </Dropdown>
            )}
          </li>

          {sizes.length > 0 && (
            <li className="relative">
              <button type="button" onClick={() => setOpen(open === "size" ? null : "size")} className="lux-link" aria-expanded={open === "size"}>
                Size{current.sizes.length > 0 && ` (${current.sizes.length})`}
              </button>
              {open === "size" && (
                <Dropdown onClose={() => setOpen(null)}>
                  {sizes.map(s => (
                    <CheckRow
                      key={s}
                      label={s}
                      checked={current.sizes.includes(s)}
                      onChange={() => toggle("sizes", s)}
                    />
                  ))}
                </Dropdown>
              )}
            </li>
          )}

          <li>
            <button
              type="button"
              onClick={() => setNewOnly(!current.newOnly)}
              className="lux-link"
              aria-pressed={current.newOnly}
              style={{ color: current.newOnly ? "var(--color-accent)" : undefined }}
            >
              New arrivals only
            </button>
          </li>

          {activeCount > 0 && (
            <li>
              <button type="button" onClick={clearAll} className="lux-link" style={{ color: "var(--color-oxblood)" }}>
                Clear all
              </button>
            </li>
          )}
        </ul>

        <div className="flex items-center gap-6">
          <span className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>
            {visibleCount === totalCount ? `${totalCount} pieces` : `${visibleCount} of ${totalCount}`}
          </span>
          <label className="text-[12px] tracking-[0.14em] uppercase font-medium flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
            Sort
            <select
              value={current.sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="bg-transparent border-b py-1 text-[12px] tracking-[0.14em] uppercase font-medium outline-none"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 pb-4 -mt-1 flex flex-wrap items-center gap-2">
          {current.brands.map(slug => {
            const b = brands.find(x => x.slug === slug);
            if (!b) return null;
            return <Chip key={`b-${slug}`} label={b.name} onRemove={() => toggle("brands", slug)} />;
          })}
          {current.sizes.map(s => <Chip key={`s-${s}`} label={`Size ${s}`} onRemove={() => toggle("sizes", s)} />)}
          {(current.priceMin !== null || current.priceMax !== null) && (
            <Chip
              label={`£${current.priceMin ?? "0"}–£${current.priceMax ?? "∞"}`}
              onRemove={() => setPriceBounds(null, null)}
            />
          )}
          {current.newOnly && <Chip label="New arrivals" onRemove={() => setNewOnly(false)} />}
        </div>
      )}

      {/* Click-away handled by the searchParams keying — but capture an Escape too */}
      {open && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpen(null)}
          aria-hidden
        />
      )}

      {/* searchParams is read to re-render on URL change */}
      <span className="sr-only">{searchParams.toString()}</span>
    </div>
  );
}

function Dropdown({ children, onClose, width = "w-56" }: { children: React.ReactNode; onClose: () => void; width?: string }) {
  return (
    <div
      className={`absolute top-full mt-3 ${width} z-20 border p-4 shadow-sm`}
      style={{ backgroundColor: "var(--color-ground)", borderColor: "var(--color-rule)" }}
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      {children}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 py-1.5 text-sm cursor-pointer" style={{ color: "var(--color-ink)" }}>
      <input type="checkbox" checked={checked} onChange={onChange} className="w-3.5 h-3.5" />
      <span className="tracking-normal normal-case">{label}</span>
    </label>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase border"
      style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)", backgroundColor: "transparent" }}
    >
      {label} <span aria-hidden style={{ color: "var(--color-muted)" }}>×</span>
    </button>
  );
}

function PriceRange({
  bounds, min, max, onApply,
}: {
  bounds: { min: number; max: number };
  min: number | null;
  max: number | null;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const [a, setA] = useState<string>(min !== null ? String(min) : "");
  const [b, setB] = useState<string>(max !== null ? String(max) : "");
  return (
    <div className="space-y-3">
      <p className="text-[10px] tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>
        Range £{bounds.min} – £{bounds.max}
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder="Min"
          value={a}
          onChange={e => setA(e.target.value)}
          className="w-full bg-transparent border-b py-1.5 text-sm outline-none"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
        <span style={{ color: "var(--color-muted)" }}>–</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Max"
          value={b}
          onChange={e => setB(e.target.value)}
          className="w-full bg-transparent border-b py-1.5 text-sm outline-none"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        />
      </div>
      <button
        type="button"
        onClick={() => onApply(a ? Number(a) : null, b ? Number(b) : null)}
        className="w-full py-2 text-[11px] tracking-[0.18em] uppercase"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
      >
        Apply
      </button>
    </div>
  );
}
