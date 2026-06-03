import type { Brand, Product } from "./data";

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

export type FacetCounts = {
  brands: Record<string, number>;
  sizes: Record<string, number>;
  newArrival: number;
};

/**
 * For each facet, count products that would survive if every *other* selected
 * facet stayed. This is the Farfetch/NaP behaviour — clicking a brand updates
 * the size counts (still reflecting your price range) but leaves the brand
 * column showing what each *other* brand would yield.
 */
export function computeFacetCounts(products: Product[], current: Filters): FacetCounts {
  const without = (key: keyof Filters): Filters => ({ ...current, [key]: Array.isArray(current[key]) ? [] : key === "newOnly" ? false : null });

  const forBrands = applyFilters(products, { ...current, brands: [] });
  const forSizes  = applyFilters(products, { ...current, sizes: [] });
  const forNew    = applyFilters(products, without("newOnly"));

  const brands: Record<string, number> = {};
  for (const p of forBrands) brands[p.brand] = (brands[p.brand] ?? 0) + 1;

  const sizes: Record<string, number> = {};
  for (const p of forSizes) for (const s of p.sizes) sizes[s] = (sizes[s] ?? 0) + 1;

  const newArrival = forNew.filter(p => p.newArrival).length;

  return { brands, sizes, newArrival };
}

export type ActiveChip = {
  key: "brand" | "size" | "price" | "new";
  value: string;
  label: string;
};

export function activeChips(current: Filters, brandsBySlug: Map<string, Brand>): ActiveChip[] {
  const chips: ActiveChip[] = [];
  for (const slug of current.brands) {
    chips.push({ key: "brand", value: slug, label: brandsBySlug.get(slug)?.name ?? slug });
  }
  for (const size of current.sizes) {
    chips.push({ key: "size", value: size, label: `Size ${size}` });
  }
  if (current.priceMin !== null || current.priceMax !== null) {
    const a = current.priceMin !== null ? `£${current.priceMin}` : "Any";
    const b = current.priceMax !== null ? `£${current.priceMax}` : "Any";
    chips.push({ key: "price", value: "price", label: `${a} – ${b}` });
  }
  if (current.newOnly) {
    chips.push({ key: "new", value: "1", label: "New arrivals" });
  }
  return chips;
}

export function removeChip(current: Filters, chip: ActiveChip): Filters {
  switch (chip.key) {
    case "brand": return { ...current, brands: current.brands.filter(b => b !== chip.value) };
    case "size":  return { ...current, sizes:  current.sizes.filter(s => s !== chip.value) };
    case "price": return { ...current, priceMin: null, priceMax: null };
    case "new":   return { ...current, newOnly: false };
  }
}
