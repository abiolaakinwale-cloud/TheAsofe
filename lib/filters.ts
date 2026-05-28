import type { Product } from "./data";

export type SortKey = "newest" | "price-asc" | "price-desc" | "name";

export type Filters = {
  brands: string[];
  sizes: string[];
  priceMin: number | null;
  priceMax: number | null;
  newOnly: boolean;
  sort: SortKey;
};

export const DEFAULT_FILTERS: Filters = {
  brands: [],
  sizes: [],
  priceMin: null,
  priceMax: null,
  newOnly: false,
  sort: "newest",
};

const SORT_KEYS: SortKey[] = ["newest", "price-asc", "price-desc", "name"];

export function parseFilters(sp: URLSearchParams | Record<string, string | string[] | undefined>): Filters {
  const get = (k: string): string | undefined => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? undefined;
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const list = (k: string): string[] => {
    const raw = get(k);
    return raw ? raw.split(",").map(s => s.trim()).filter(Boolean) : [];
  };
  const num = (k: string): number | null => {
    const raw = get(k);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const sort = (get("sort") as SortKey) || "newest";
  return {
    brands:  list("brand"),
    sizes:   list("size"),
    priceMin: num("min"),
    priceMax: num("max"),
    newOnly: get("new") === "1",
    sort: SORT_KEYS.includes(sort) ? sort : "newest",
  };
}

export function serializeFilters(f: Filters): URLSearchParams {
  const out = new URLSearchParams();
  if (f.brands.length)        out.set("brand", f.brands.join(","));
  if (f.sizes.length)         out.set("size",  f.sizes.join(","));
  if (f.priceMin !== null)    out.set("min",   String(f.priceMin));
  if (f.priceMax !== null)    out.set("max",   String(f.priceMax));
  if (f.newOnly)              out.set("new",   "1");
  if (f.sort !== "newest")    out.set("sort",  f.sort);
  return out;
}

export function applyFilters(products: Product[], f: Filters): Product[] {
  let out = products;
  if (f.brands.length)     out = out.filter(p => f.brands.includes(p.brand));
  if (f.sizes.length)      out = out.filter(p => p.sizes.some(s => f.sizes.includes(s)));
  if (f.priceMin !== null) out = out.filter(p => p.price >= f.priceMin!);
  if (f.priceMax !== null) out = out.filter(p => p.price <= f.priceMax!);
  if (f.newOnly)           out = out.filter(p => p.newArrival);

  switch (f.sort) {
    case "price-asc":  return [...out].sort((a, b) => a.price - b.price);
    case "price-desc": return [...out].sort((a, b) => b.price - a.price);
    case "name":       return [...out].sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
    default:           return out; // queries already return newest-first
  }
}

export function activeFilterCount(f: Filters): number {
  return (
    (f.brands.length ? 1 : 0) +
    (f.sizes.length ? 1 : 0) +
    (f.priceMin !== null || f.priceMax !== null ? 1 : 0) +
    (f.newOnly ? 1 : 0)
  );
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest",     label: "Newest" },
  { value: "price-asc",  label: "Price · low to high" },
  { value: "price-desc", label: "Price · high to low" },
  { value: "name",       label: "Name · A to Z" },
];
