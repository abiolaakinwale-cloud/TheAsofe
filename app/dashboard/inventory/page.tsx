import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { updateSingleStock } from "./actions";

const LOW_STOCK_THRESHOLD = 3;

const FILTERS = ["low", "out", "all"] as const;
type Filter = typeof FILTERS[number];

export const metadata = { title: "Inventory" };

export default async function InventoryDashboard({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter: Filter = FILTERS.includes(filterParam as Filter) ? (filterParam as Filter) : "low";

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard/inventory");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  // RLS scopes stock_levels to the seller's brand automatically; admin sees all.
  let q = sb
    .from("stock_levels")
    .select("product_slug, colour, size, quantity, updated_at, products!inner(name, brand)")
    .order("quantity", { ascending: true });
  if (filter === "low") q = q.lte("quantity", LOW_STOCK_THRESHOLD);
  if (filter === "out") q = q.eq("quantity", 0);
  const { data: rows } = await q.limit(500);

  type Row = {
    product_slug: string;
    colour: string;
    size: string;
    quantity: number;
    updated_at: string;
    products: { name: string; brand: string } | null;
  };
  const stockRows = (rows as unknown as Row[]) ?? [];

  // Counts for the filter pills
  const [{ count: outCount }, { count: lowCount }, { count: allCount }] = await Promise.all([
    sb.from("stock_levels").select("product_slug", { count: "exact", head: true }).eq("quantity", 0),
    sb.from("stock_levels").select("product_slug", { count: "exact", head: true }).lte("quantity", LOW_STOCK_THRESHOLD),
    sb.from("stock_levels").select("product_slug", { count: "exact", head: true }),
  ]);

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Inventory</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        {lowCount ?? 0} {lowCount === 1 ? "variant" : "variants"} at or below {LOW_STOCK_THRESHOLD}.
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        Quick-edit any row to top up. Admins receive a low-stock alert when a sale drops stock to {LOW_STOCK_THRESHOLD} or fewer — keeping this list short means fewer alerts and fewer sold-out moments for customers.
      </p>

      <nav className="flex flex-wrap gap-x-6 gap-y-2 mb-12 text-[11px] tracking-[0.18em] uppercase font-medium">
        <Link href="/dashboard/inventory?filter=out" className="lux-link" style={{ color: filter === "out" ? "var(--color-oxblood)" : "var(--color-muted)" }}>
          Sold out ({outCount ?? 0})
        </Link>
        <Link href="/dashboard/inventory?filter=low" className="lux-link" style={{ color: filter === "low" ? "var(--color-saffron)" : "var(--color-muted)" }}>
          Low ≤ {LOW_STOCK_THRESHOLD} ({lowCount ?? 0})
        </Link>
        <Link href="/dashboard/inventory?filter=all" className="lux-link" style={{ color: filter === "all" ? "var(--color-ink)" : "var(--color-muted)" }}>
          All ({allCount ?? 0})
        </Link>
      </nav>

      {stockRows.length === 0 ? (
        <div className="max-w-2xl p-8" style={{ backgroundColor: "var(--color-cream)" }}>
          <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>All clear</p>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-ink)" }}>
            {filter === "low"
              ? `Nothing at or below ${LOW_STOCK_THRESHOLD} units. Every variant has comfortable headroom.`
              : filter === "out"
              ? "No variants are currently sold out."
              : "No stock rows on file yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-px max-w-5xl">
          {stockRows.map(r => {
            const isOut = r.quantity === 0;
            const isLow = r.quantity > 0 && r.quantity <= LOW_STOCK_THRESHOLD;
            const dotColour = isOut
              ? "var(--color-oxblood)"
              : isLow
              ? "var(--color-saffron)"
              : "var(--color-emerald)";
            return (
              <li key={`${r.product_slug}-${r.colour}-${r.size}`} className="grid grid-cols-12 gap-4 items-center p-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                <span aria-hidden className="col-span-1 inline-block w-2 h-2 rounded-full" style={{ backgroundColor: dotColour }} />

                <div className="col-span-11 lg:col-span-5">
                  <Link href={`/dashboard/products/${r.product_slug}/edit`} className="text-sm tracking-[0.10em] uppercase lux-link" style={{ color: "var(--color-ink)" }}>
                    {r.products?.name ?? r.product_slug}
                  </Link>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                    {r.colour || "Default"} · Size {r.size} · updated {new Date(r.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>

                <p className="hidden lg:block lg:col-span-2 text-sm tabular-nums" style={{ color: isOut ? "var(--color-oxblood)" : "var(--color-ink)" }}>
                  {isOut ? "Sold out" : `${r.quantity} in stock`}
                </p>

                <form action={updateSingleStock} className="col-span-12 lg:col-span-4 flex items-center gap-2 justify-end">
                  <input type="hidden" name="slug" value={r.product_slug} />
                  <input type="hidden" name="colour" value={r.colour} />
                  <input type="hidden" name="size" value={r.size} />
                  <label className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Set to</label>
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    defaultValue={r.quantity}
                    className="w-20 h-10 border bg-transparent px-2 text-sm tabular-nums text-center"
                    style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                  />
                  <button
                    type="submit"
                    className="px-4 h-10 text-[10px] tracking-[0.22em] uppercase font-medium"
                    style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
                  >
                    Save
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
