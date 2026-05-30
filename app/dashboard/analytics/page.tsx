import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/data";

// Order statuses that count as revenue (excludes pending / cancelled / refunded)
const REVENUE_STATUSES = ["paid", "packed", "dispatched", "delivered"] as const;

export default async function DashboardAnalyticsPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard/analytics");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  const admin = getAdminSupabase();

  // Pull every order_items row for this brand, joined to the order metadata
  // (status + created_at) so we can bucket by time and filter by status.
  const itemsQuery = admin
    .from("order_items")
    .select("name, qty, unit_price, product_slug, orders!inner(status, created_at)")
    .order("created_at", { ascending: false, referencedTable: "orders" });
  const { data: itemsRaw } = profile.brand
    ? await itemsQuery.eq("brand_slug", profile.brand)
    : await itemsQuery;

  type Row = {
    name: string;
    qty: number;
    unit_price: number;
    product_slug: string;
    orders: { status: string; created_at: string } | null;
  };
  const items = (itemsRaw ?? []) as unknown as Row[];

  // ─── Compute the headline numbers ────────────────────────────────
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const counted = items.filter(i => i.orders && (REVENUE_STATUSES as readonly string[]).includes(i.orders.status));
  const lifetime = sumLines(counted);

  const last30 = counted.filter(i => i.orders && new Date(i.orders.created_at) >= thirtyDaysAgo);
  const last30Sums = sumLines(last30);

  const ordersThis30Days = new Set(
    items
      .filter(i => i.orders && new Date(i.orders.created_at) >= thirtyDaysAgo && (REVENUE_STATUSES as readonly string[]).includes(i.orders.status))
      .map(i => `${i.orders!.created_at}-${i.product_slug}`)
  ).size; // approximate "lines this month"; we don't have order_id in select

  // ─── Best sellers — units sold, lifetime ─────────────────────────
  const unitsByProduct = new Map<string, { name: string; units: number; revenue: number }>();
  for (const i of counted) {
    const cur = unitsByProduct.get(i.product_slug) ?? { name: i.name, units: 0, revenue: 0 };
    cur.units += i.qty;
    cur.revenue += i.qty * i.unit_price;
    unitsByProduct.set(i.product_slug, cur);
  }
  const bestSellers = Array.from(unitsByProduct.entries())
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  // ─── Revenue by week — last 12 weeks ─────────────────────────────
  type WeekBucket = { key: string; label: string; revenue: number; units: number };
  const weeks: WeekBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    weeks.push({
      key: `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`,
      label: end.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      revenue: 0,
      units: 0,
    });
  }
  for (const i of counted) {
    if (!i.orders) continue;
    const d = new Date(i.orders.created_at);
    const idx = weeks.findIndex(w => {
      const [s, e] = w.key.split("_");
      return d >= new Date(s) && d < new Date(e);
    });
    if (idx >= 0) {
      weeks[idx].revenue += i.qty * i.unit_price;
      weeks[idx].units += i.qty;
    }
  }
  const maxWeekRevenue = Math.max(...weeks.map(w => w.revenue), 1); // avoid /0

  // ─── Status breakdown ────────────────────────────────────────────
  const statusCounts = new Map<string, number>();
  for (const i of items) {
    const s = i.orders?.status ?? "unknown";
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  }

  const totalLines = items.length;
  const hasAnyData = totalLines > 0;

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Performance</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        Analytics.
      </h1>

      {!hasAnyData ? (
        <div className="max-w-2xl py-16">
          <p className="serif text-2xl mb-4" style={{ color: "var(--color-ink)" }}>No orders yet.</p>
          <p className="text-base leading-relaxed mb-6" style={{ color: "var(--color-ink-soft)" }}>
            Analytics will populate here as soon as a customer buys a piece from your house. In the meantime,{" "}
            <Link href="/dashboard/products" className="lux-link" style={{ color: "var(--color-ink)" }}>
              make sure your collection is published and stocked
            </Link>.
          </p>
        </div>
      ) : (
        <>
          {/* ─── Headline stats ───────────────────────────────── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px mb-16">
            <Stat k="Revenue · last 30d" v={formatPrice(last30Sums.revenue)} />
            <Stat k="Units · last 30d"   v={String(last30Sums.units)} />
            <Stat k="Lines · last 30d"   v={String(ordersThis30Days)} />
            <Stat k="Revenue · lifetime" v={formatPrice(lifetime.revenue)} accent="var(--color-emerald)" />
          </div>

          {/* ─── Revenue by week ──────────────────────────────── */}
          <section className="mb-16">
            <div className="flex items-end justify-between mb-6 pb-3 border-b" style={{ borderColor: "var(--color-rule)" }}>
              <h2 className="display text-2xl lg:text-3xl" style={{ color: "var(--color-ink)" }}>Revenue by week.</h2>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Last 12 weeks</p>
            </div>
            <ul className="space-y-3">
              {weeks.map(w => (
                <li key={w.key} className="grid grid-cols-12 items-center gap-4 text-sm">
                  <span className="col-span-2 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                    {w.label}
                  </span>
                  <div className="col-span-7 lg:col-span-8 h-6 relative" style={{ backgroundColor: "var(--color-cream)" }}>
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${(w.revenue / maxWeekRevenue) * 100}%`,
                        backgroundColor: w.revenue > 0 ? "var(--color-emerald)" : "transparent",
                      }}
                    />
                  </div>
                  <span className="col-span-3 lg:col-span-2 text-right tabular-nums" style={{ color: "var(--color-ink)" }}>
                    {w.revenue > 0 ? formatPrice(w.revenue) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ─── Best sellers ─────────────────────────────────── */}
          <section className="mb-16">
            <div className="flex items-end justify-between mb-6 pb-3 border-b" style={{ borderColor: "var(--color-rule)" }}>
              <h2 className="display text-2xl lg:text-3xl" style={{ color: "var(--color-ink)" }}>Best sellers.</h2>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>By units · lifetime</p>
            </div>
            <ul className="space-y-px">
              {bestSellers.map((b, i) => (
                <li key={b.slug} className="p-4 grid grid-cols-12 items-center gap-4 text-sm" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                  <span className="col-span-1 display text-2xl tabular-nums" style={{ color: "var(--color-muted)" }}>
                    {i + 1}
                  </span>
                  <Link
                    href={`/dashboard/products/${b.slug}/edit`}
                    className="col-span-7 lg:col-span-7 serif text-base lux-link truncate"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {b.name}
                  </Link>
                  <span className="col-span-2 text-[11px] tracking-[0.18em] uppercase tabular-nums text-right" style={{ color: "var(--color-ink-soft)" }}>
                    {b.units} units
                  </span>
                  <span className="col-span-2 text-right tabular-nums" style={{ color: "var(--color-ink)" }}>
                    {formatPrice(b.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ─── Status breakdown ─────────────────────────────── */}
          <section>
            <div className="flex items-end justify-between mb-6 pb-3 border-b" style={{ borderColor: "var(--color-rule)" }}>
              <h2 className="display text-2xl lg:text-3xl" style={{ color: "var(--color-ink)" }}>Order status.</h2>
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Line counts across all orders</p>
            </div>
            <ul className="flex flex-wrap gap-4">
              {Array.from(statusCounts.entries()).map(([status, count]) => (
                <li
                  key={status}
                  className="px-5 py-3 text-sm flex items-baseline gap-3"
                  style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)", color: "var(--color-ink)" }}
                >
                  <span className="display text-2xl tabular-nums">{count}</span>
                  <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
                    {status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function sumLines(items: { qty: number; unit_price: number }[]): { revenue: number; units: number } {
  let revenue = 0;
  let units = 0;
  for (const i of items) {
    revenue += i.qty * i.unit_price;
    units += i.qty;
  }
  return { revenue, units };
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: string }) {
  return (
    <div className="p-8" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[11px] tracking-[0.18em] uppercase mb-4" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-4xl tabular-nums" style={{ color: accent ?? "var(--color-ink)" }}>{v}</p>
    </div>
  );
}
