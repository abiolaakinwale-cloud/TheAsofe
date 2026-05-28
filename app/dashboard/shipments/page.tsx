import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

const STATUSES = ["awaiting_dispatch", "in_transit", "customs", "arrived", "inducted", "cancelled"] as const;
type Status = typeof STATUSES[number];

const colour: Record<Status, string> = {
  awaiting_dispatch: "var(--color-muted)",
  in_transit:        "var(--color-saffron)",
  customs:           "var(--color-cobalt)",
  arrived:           "var(--color-emerald)",
  inducted:          "var(--color-ink)",
  cancelled:         "var(--color-oxblood)",
};

const labelOf = (s: Status) => s.replace(/_/g, " ");

export default async function DashboardShipmentsPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard/shipments");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  const admin = getAdminSupabase();
  let q = admin
    .from("shipments")
    .select("id, status, expected_arrival, received_at, created_at, shipment_items(qty, received_qty)")
    .order("created_at", { ascending: false });
  if (profile.role === "seller") q = q.eq("brand", profile.brand!);
  const { data: shipments } = await q;

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Your consignments</p>
      <h1 className="display text-4xl lg:text-5xl mb-2" style={{ color: "var(--color-ink)" }}>
        {shipments?.length ?? 0} {(shipments?.length ?? 0) === 1 ? "shipment" : "shipments"} to the UK hub.
      </h1>
      <p className="text-sm mb-12 max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
        These are pieces moving from your studio to Asofe's London facility. Asofe logs them and inducts on arrival.
      </p>

      {(shipments ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No consignments yet. Asofe will log incoming shipments here once they've been announced.
        </p>
      ) : (
        <ul className="space-y-px">
          {shipments!.map(s => {
            const lines = (s.shipment_items as { qty: number; received_qty: number | null }[]) ?? [];
            const planned  = lines.reduce((n, l) => n + (l.qty ?? 0), 0);
            const received = lines.reduce((n, l) => n + (l.received_qty ?? 0), 0);
            return (
              <li key={s.id} className="p-6 grid grid-cols-12 items-center gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
                <div className="col-span-12 lg:col-span-4">
                  <p className="serif text-xl tabular-nums" style={{ color: "var(--color-ink)" }}>#{s.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>logged {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <p className="col-span-6 lg:col-span-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                  {planned} planned{received > 0 && ` · ${received} inducted`}
                </p>
                <p className="col-span-3 lg:col-span-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                  {s.received_at
                    ? `Arrived ${new Date(s.received_at).toLocaleDateString()}`
                    : s.expected_arrival ? `ETA ${s.expected_arrival}` : "—"}
                </p>
                <div className="col-span-3 lg:col-span-2 flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase justify-end" style={{ color: colour[s.status as Status] }}>
                  <span className="w-1.5 h-1.5" style={{ backgroundColor: colour[s.status as Status] }} />
                  {labelOf(s.status as Status)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
