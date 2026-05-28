import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";

const LOW_STOCK = 3;

type Row = {
  product_slug: string;
  size: string;
  quantity: number;
  updated_at: string;
  products: { name: string; brand: string; category: string; published: boolean } | null;
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; sort?: string }>;
}) {
  const { brand: brandFilter, sort } = await searchParams;
  const sortAsc = sort !== "qty_desc"; // default: lowest first

  const sb = getAdminSupabase();
  let q = sb
    .from("stock_levels")
    .select("product_slug, size, quantity, updated_at, products!inner(name, brand, category, published)")
    .order("quantity", { ascending: sortAsc });
  if (brandFilter) q = q.eq("products.brand", brandFilter);
  const { data: rows } = await q;

  const { data: brands } = await sb.from("brands").select("slug, name").order("name");
  const stock = (rows ?? []) as unknown as Row[];

  const totalSku = stock.length;
  const totalUnits = stock.reduce((n, r) => n + r.quantity, 0);
  const lowCount = stock.filter(r => r.quantity <= LOW_STOCK).length;
  const outCount = stock.filter(r => r.quantity === 0).length;

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Inventory</p>
      <h1 className="display text-4xl lg:text-5xl mb-2" style={{ color: "var(--color-ink)" }}>
        {totalUnits} units at the hub.
      </h1>
      <p className="text-sm mb-10" style={{ color: "var(--color-muted)" }}>
        {totalSku} live (product, size) lines · {lowCount} low stock · {outCount} sold out
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-6 mb-10 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/admin/inventory" className="lux-link" style={{ color: !brandFilter ? "var(--color-ink)" : "var(--color-muted)" }}>
          All designers
        </Link>
        {(brands ?? []).map(b => (
          <Link key={b.slug} href={`/admin/inventory?brand=${b.slug}`} className="lux-link" style={{ color: brandFilter === b.slug ? "var(--color-ink)" : "var(--color-muted)" }}>
            {b.name}
          </Link>
        ))}
        <span className="ml-auto" style={{ color: "var(--color-muted)" }}>
          Sort:{" "}
          <Link href={`/admin/inventory${brandFilter ? `?brand=${brandFilter}` : ""}`} className="lux-link" style={{ color: sortAsc ? "var(--color-ink)" : "var(--color-muted)" }}>
            Low first
          </Link>
          {" · "}
          <Link href={`/admin/inventory?${brandFilter ? `brand=${brandFilter}&` : ""}sort=qty_desc`} className="lux-link" style={{ color: !sortAsc ? "var(--color-ink)" : "var(--color-muted)" }}>
            High first
          </Link>
        </span>
      </div>

      {stock.length === 0 ? (
        <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>No stock yet for this filter.</p>
      ) : (
        <ul className="space-y-px">
          {stock.map((r, i) => {
            const low = r.quantity <= LOW_STOCK;
            return (
              <li key={`${r.product_slug}-${r.size}-${i}`} className="p-4 lg:p-5 grid grid-cols-12 items-center gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)", backgroundColor: low ? "var(--color-blush)" : "transparent" }}>
                <div className="col-span-12 lg:col-span-5">
                  <Link href={`/products/${r.product_slug}`} className="serif text-base lux-link" style={{ color: "var(--color-ink)" }}>
                    {r.products?.name ?? r.product_slug}
                  </Link>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{r.products?.brand} · {r.products?.category}</p>
                </div>
                <p className="col-span-4 lg:col-span-2 text-sm tracking-[0.18em] uppercase" style={{ color: "var(--color-ink)" }}>{r.size}</p>
                <p className="col-span-4 lg:col-span-2 text-sm tabular-nums" style={{ color: low ? "var(--color-oxblood)" : "var(--color-ink)" }}>
                  {r.quantity === 0 ? "Sold out" : `${r.quantity} left`}
                </p>
                <p className="col-span-4 lg:col-span-2 text-xs" style={{ color: "var(--color-muted)" }}>
                  {r.products?.published ? "Live" : "Draft"}
                </p>
                <p className="col-span-12 lg:col-span-1 text-[10px] text-right" style={{ color: "var(--color-muted)" }}>
                  {new Date(r.updated_at).toLocaleDateString()}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
