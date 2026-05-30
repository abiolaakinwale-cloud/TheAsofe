import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/data";

export default async function DashboardOrdersPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard/orders");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  const admin = getAdminSupabase();
  // Find every order that contains at least one item from this seller's brand.
  const { data: items } = await admin
    .from("order_items")
    .select("order_id, name, size, qty, unit_price, orders!inner(id, status, created_at, customer_email)")
    .eq("brand_slug", profile.brand!);

  // Group by order
  type O = { id: string; status: string; created_at: string; customer_email: string };
  type Line = { name: string; size: string; qty: number; unit_price: number };
  const grouped = new Map<string, { order: O; lines: Line[]; brandSubtotal: number }>();
  for (const it of items ?? []) {
    const o = (it.orders as unknown) as O;
    if (!o) continue;
    const g = grouped.get(o.id) ?? { order: o, lines: [], brandSubtotal: 0 };
    g.lines.push({ name: it.name, size: it.size, qty: it.qty, unit_price: it.unit_price });
    g.brandSubtotal += it.qty * it.unit_price;
    grouped.set(o.id, g);
  }
  const rows = Array.from(grouped.values()).sort((a, b) => b.order.created_at.localeCompare(a.order.created_at));

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Orders for your house</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {rows.length} {rows.length === 1 ? "order" : "orders"}.
      </h1>

      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No orders yet. Once a customer buys a piece from your house, it'll appear here.</p>
      ) : (
        <ul className="space-y-px">
          {rows.map(r => (
            <li key={r.order.id} className="p-6 grid grid-cols-12 items-start gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="col-span-12 lg:col-span-3">
                <p className="serif text-xl tabular-nums" style={{ color: "var(--color-ink)" }}>#{r.order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{new Date(r.order.created_at).toLocaleString()}</p>
              </div>
              <div className="col-span-7 lg:col-span-6">
                <ul className="space-y-1">
                  {r.lines.map((l, i) => (
                    <li key={i} className="text-sm" style={{ color: "var(--color-ink)" }}>
                      <span className="tabular-nums">{l.qty}×</span> {l.name} <span style={{ color: "var(--color-muted)" }}>· size {l.size}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="col-span-3 lg:col-span-2 text-right tabular-nums" style={{ color: "var(--color-ink-soft)" }}>{formatPrice(r.brandSubtotal)}</p>
              <p className="col-span-2 lg:col-span-1 text-right text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{r.order.status}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
