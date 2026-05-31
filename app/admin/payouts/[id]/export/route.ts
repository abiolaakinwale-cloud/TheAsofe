import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auth: admin OR the brand owner (seller of that brand)
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  const admin = getAdminSupabase();

  const { data: payout } = await admin
    .from("payouts")
    .select("brand, period_start, period_end, gross_total, refund_total, commission_amount, net_amount, currency, status")
    .eq("id", id)
    .maybeSingle();
  if (!payout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = profile?.role === "admin";
  const isOwner = profile?.role === "seller" && profile.brand === payout.brand;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: lines } = await admin
    .from("payout_lines")
    .select("order_id, product_slug, product_name, qty, unit_price, gross_amount, refund_amount, commission_rate, net_amount")
    .eq("payout_id", id);

  const rows: (string | number)[][] = [];
  rows.push(["Asofe payout"]);
  rows.push(["Brand", payout.brand]);
  rows.push(["Period", `${payout.period_start} to ${payout.period_end}`]);
  rows.push(["Currency", payout.currency]);
  rows.push(["Status", payout.status]);
  rows.push([]);
  rows.push(["Order", "Slug", "Piece", "Qty", "Unit price", "Gross", "Refund", "Commission rate", "Net"]);
  for (const l of lines ?? []) {
    rows.push([
      l.order_id.slice(0, 8),
      l.product_slug,
      l.product_name,
      l.qty,
      l.unit_price,
      l.gross_amount,
      l.refund_amount,
      l.commission_rate,
      l.net_amount,
    ]);
  }
  rows.push([]);
  rows.push(["", "", "", "", "Gross total",       payout.gross_total]);
  rows.push(["", "", "", "", "Refund total",      payout.refund_total]);
  rows.push(["", "", "", "", "Commission amount", payout.commission_amount]);
  rows.push(["", "", "", "", "Net owed",          payout.net_amount]);

  const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="asofe-payout-${payout.brand}-${payout.period_start}-to-${payout.period_end}.csv"`,
    },
  });
}
