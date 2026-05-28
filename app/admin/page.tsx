import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";

export default async function AdminOverviewPage() {
  const sb = getAdminSupabase();

  const [apps, brands, products, profiles, orders, shipments] = await Promise.all([
    sb.from("applications").select("status", { count: "exact", head: false }),
    sb.from("brands").select("slug", { count: "exact", head: true }),
    sb.from("products").select("slug", { count: "exact", head: true }),
    sb.from("profiles").select("role", { count: "exact", head: false }),
    sb.from("orders").select("status, total"),
    sb.from("shipments").select("status"),
  ]);

  const pending = (apps.data ?? []).filter(a => a.status === "pending").length;
  const sellers = (profiles.data ?? []).filter(p => p.role === "seller").length;
  const awaitingFulfilment = (orders.data ?? []).filter(o => o.status === "paid" || o.status === "packed").length;
  const grossSales = (orders.data ?? [])
    .filter(o => o.status !== "pending" && o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total ?? 0), 0);
  const inboundShipments = (shipments.data ?? []).filter(s =>
    s.status === "awaiting_dispatch" || s.status === "in_transit" || s.status === "customs"
  ).length;

  const stats = [
    { label: "Pending applications", v: pending,             href: "/admin/applications" },
    { label: "Awaiting fulfilment",  v: awaitingFulfilment,  href: "/admin/orders?status=paid" },
    { label: "Inbound consignments", v: inboundShipments,    href: "/admin/shipments?status=in_transit" },
    { label: "Brands",               v: brands.count ?? 0,   href: "/admin/brands" },
    { label: "Sellers",              v: sellers,             href: "/admin/users" },
    { label: "Gross sales (£)",      v: grossSales,          href: "/admin/orders" },
  ];

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>The House Floor</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        Operations overview.
      </h1>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-px">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="block p-8 lg:p-10 transition-colors hover:bg-[var(--color-cream)]" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
            <p className="text-[11px] tracking-[0.18em] uppercase mb-6" style={{ color: "var(--color-muted)" }}>{s.label}</p>
            <p className="display text-4xl lg:text-5xl tabular-nums" style={{ color: "var(--color-ink)" }}>{s.v}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
