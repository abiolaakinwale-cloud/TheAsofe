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
  brands: Brand[];
  sizes: string[];
  priceBounds: { min: number; max: number };
  current: Filters;
  totalCount: number;
  visibleCount: number;
};

const SORT_LABEL: Record<SortKey, string> = {
  newest:     "Newest",
  "price-asc":  "Price · low to high",
  "price-desc": "Price · high to low",
  name:       "Name · A to Z",
};

export default function FilterSidebar({ brands, sizes, priceBounds, current, totalCount, visibleCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Accordion state — default to having Brand + Price open if there are values
  const [open, setOpen] = useState<Record<string, boolean>>({
    brand: brands.length > 0,
    price: true,
    size:  false,
    other: true,
    sort:  true,
  });

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
  function setSort(sort: SortKey)         { apply({ ...current, sort }); }
  function setNewOnly(v: boolean)         { apply({ ...current, newOnly: v }); }
  function setPriceBounds(min: number | null, max: number | null) {
    apply({ ...current, priceMin: min, priceMax: max });
  }
  function clearAll() {
    apply({ ...current, brands: [], sizes: [], priceMin: null, priceMax: null, newOnly: false });
  }

  const activeCount = activeFilterCount(current);
  const section = (key: keyof typeof open) => () =>
    setOpen(o => ({ ...o, [key]: !o[key] }));

  const Panel = (
    <div className="space-y-px" style={{ color: "var(--color-ink)" }}>
      <Header
        title="Sort"
        isOpen={open.sort}
        onToggle={section("sort")}
      />
      {open.sort && (
        <ul className="pb-5 pt-1 space-y-2 text-sm">
          {SORT_OPTIONS.map(o => (
            <li key={o.value}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  checked={current.sort === o.value}
                  onChange={() => setSort(o.value)}
                  className="w-3.5 h-3.5"
                />
                <span>{SORT_LABEL[o.value]}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {brands.length > 0 && (
        <>
          <Header
            title="Designer"
            count={current.brands.length}
            isOpen={open.brand}
            onToggle={section("brand")}
          />
          {open.brand && (
            <ul className="pb-5 pt-1 space-y-2 max-h-72 overflow-y-auto pr-2 text-sm">
              {brands.map(b => (
                <li key={b.slug}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current.brands.includes(b.slug)}
                      onChange={() => toggle("brands", b.slug)}
                      className="w-3.5 h-3.5"
                    />
                    <span>{b.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Header
        title="Price"
        isOpen={open.price}
        onToggle={section("price")}
        accent={current.priceMin !== null || current.priceMax !== null ? "·" : undefined}
      />
      {open.price && (
        <PriceRange
          bounds={priceBounds}
          min={current.priceMin}
          max={current.priceMax}
          onApply={setPriceBounds}
        />
      )}

      {sizes.length > 0 && (
        <>
          <Header
            title="Size"
            count={current.sizes.length}
            isOpen={open.size}
            onToggle={section("size")}
          />
          {open.size && (
            <ul className="pb-5 pt-2 grid grid-cols-4 gap-2 text-xs">
              {sizes.map(s => {
                const active = current.sizes.includes(s);
                return (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => toggle("sizes", s)}
                      className="w-full py-2 tracking-[0.1em] uppercase border"
                      style={{
                        borderColor: active ? "var(--color-ink)" : "var(--color-rule)",
                        backgroundColor: active ? "var(--color-ink)" : "transparent",
                        color: active ? "var(--color-ground)" : "var(--color-ink)",
                      }}
                    >
                      {s}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Header
        title="Other"
        isOpen={open.other}
        onToggle={section("other")}
      />
      {open.other && (
        <div className="pb-5 pt-1 text-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={current.newOnly}
              onChange={e => setNewOnly(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            <span style={{ color: current.newOnly ? "var(--color-accent)" : undefined }}>New arrivals only</span>
          </label>
        </div>
      )}

      {activeCount > 0 && (
        <div className="pt-4">
          <button
            type="button"
            onClick={clearAll}
            className="w-full py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
            style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile filter toggle bar */}
      <div className="lg:hidden flex items-center justify-between gap-4 border-y" style={{ borderColor: "var(--color-rule)" }}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 py-4 -my-px text-[12px] tracking-[0.18em] uppercase font-medium min-h-[48px]"
          style={{ color: "var(--color-ink)" }}
          aria-label="Open filter and sort"
        >
          Filter &amp; Sort {activeCount > 0 && <span style={{ color: "var(--color-muted)" }}>· {activeCount}</span>}
        </button>
        <span className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>
          {visibleCount === totalCount ? `${totalCount} pieces` : `${visibleCount} / ${totalCount}`}
        </span>
      </div>

      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-32">
          <div className="flex items-baseline justify-between mb-6 pb-4 border-b" style={{ borderColor: "var(--color-rule)" }}>
            <p className="eyebrow" style={{ color: "var(--color-ink)" }}>Refine</p>
            <span className="text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>
              {visibleCount === totalCount ? `${totalCount} pieces` : `${visibleCount} / ${totalCount}`}
            </span>
          </div>
          {Panel}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: "var(--color-ground)" }}>
          <div className="px-6 py-5 flex items-center justify-between border-b sticky top-0" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
            <p className="eyebrow" style={{ color: "var(--color-ink)" }}>Filter &amp; Sort</p>
            <button type="button" aria-label="Close" onClick={() => setMobileOpen(false)} className="text-2xl leading-none w-11 h-11 -mr-3 flex items-center justify-center">×</button>
          </div>
          <div className="px-6 py-6 pb-32">{Panel}</div>
          <div className="fixed bottom-0 inset-x-0 p-4 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="w-full py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
            >
              View {visibleCount} {visibleCount === 1 ? "piece" : "pieces"}
            </button>
          </div>
        </div>
      )}

      {/* searchParams keys the component so it re-renders on URL change */}
      <span className="sr-only" aria-hidden>{searchParams.toString()}</span>
    </>
  );
}

function Header({
  title, count, isOpen, onToggle, accent,
}: {
  title: string; count?: number; isOpen: boolean; onToggle: () => void; accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-4 text-[11px] tracking-[0.22em] uppercase font-medium border-t"
      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      aria-expanded={isOpen}
    >
      <span>
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-2" style={{ color: "var(--color-muted)" }}>({count})</span>
        )}
        {accent && <span className="ml-2" style={{ color: "var(--color-muted)" }}>{accent}</span>}
      </span>
      <span aria-hidden style={{ color: "var(--color-muted)" }}>{isOpen ? "−" : "+"}</span>
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
    <div className="pb-5 pt-1 space-y-3">
      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
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
