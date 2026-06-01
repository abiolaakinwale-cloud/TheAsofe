import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function poundsFromPence(intGbp: number, currency = "GBP"): string {
  // orders/items in this app store GBP as integer pounds (not pence). Render
  // with the configured currency for clarity.
  return `${currency} ${intGbp.toFixed(2)}`;
}

/**
 * Returns the signed-in customer's full order history as CSV, one row per
 * order_item. Optional ?year=YYYY filters by order created_at year.
 * Optional ?status=paid|delivered|… narrows further.
 *
 * Useful for tax season, expense claims, gift-receipt reconciliation, or
 * just personal records. RLS scopes orders + order_items to the caller,
 * so a customer can never read someone else's history.
 */
export async function GET(request: NextRequest) {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const yearStr = params.get("year");
  const status  = params.get("status");

  let q = sb
    .from("orders")
    .select(`
      id, created_at, status, subtotal, shipping, total, currency,
      delivered_at, dispatched_at, courier, tracking_ref,
      order_items(name, brand_slug, colour, size, qty, unit_price),
      addresses:shipping_address_id(city, postcode, country)
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (yearStr && /^\d{4}$/.test(yearStr)) {
    q = q
      .gte("created_at", `${yearStr}-01-01T00:00:00Z`)
      .lt("created_at",  `${Number(yearStr) + 1}-01-01T00:00:00Z`);
  }
  if (status) q = q.eq("status", status);

  const { data: orders, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Address = { city: string; postcode: string; country: string };
  type Item = { name: string; brand_slug: string; colour: string | null; size: string; qty: number; unit_price: number };
  type Order = {
    id: string;
    created_at: string;
    status: string;
    subtotal: number;
    shipping: number;
    total: number;
    currency: string;
    delivered_at: string | null;
    dispatched_at: string | null;
    courier: string | null;
    tracking_ref: string | null;
    order_items: Item[];
    addresses: Address | Address[] | null;
  };

  const typed = (orders ?? []) as unknown as Order[];

  const rows: (string | number)[][] = [];
  rows.push([
    "Order ID",
    "Order date",
    "Status",
    "Designer",
    "Piece",
    "Colour",
    "Size",
    "Qty",
    "Unit price",
    "Line total",
    "Order subtotal",
    "Order shipping",
    "Order total",
    "Currency",
    "Dispatched",
    "Delivered",
    "Courier",
    "Tracking ref",
    "Shipping city",
    "Shipping postcode",
    "Shipping country",
  ]);

  for (const o of typed) {
    const addrRaw = o.addresses;
    const addr: Address | null = Array.isArray(addrRaw) ? addrRaw[0] ?? null : addrRaw;
    const orderDate = o.created_at.slice(0, 10);
    const dispatched = o.dispatched_at ? o.dispatched_at.slice(0, 10) : "";
    const delivered  = o.delivered_at  ? o.delivered_at.slice(0, 10)  : "";

    if (!o.order_items?.length) {
      rows.push([
        o.id, orderDate, o.status, "", "", "", "", 0, "", "",
        poundsFromPence(o.subtotal, o.currency),
        poundsFromPence(o.shipping, o.currency),
        poundsFromPence(o.total,    o.currency),
        o.currency,
        dispatched, delivered,
        o.courier ?? "", o.tracking_ref ?? "",
        addr?.city ?? "", addr?.postcode ?? "", addr?.country ?? "",
      ]);
      continue;
    }

    for (const it of o.order_items) {
      rows.push([
        o.id,
        orderDate,
        o.status,
        it.brand_slug,
        it.name,
        it.colour ?? "",
        it.size,
        it.qty,
        poundsFromPence(it.unit_price, o.currency),
        poundsFromPence(it.unit_price * it.qty, o.currency),
        poundsFromPence(o.subtotal, o.currency),
        poundsFromPence(o.shipping, o.currency),
        poundsFromPence(o.total,    o.currency),
        o.currency,
        dispatched,
        delivered,
        o.courier ?? "",
        o.tracking_ref ?? "",
        addr?.city ?? "",
        addr?.postcode ?? "",
        addr?.country ?? "",
      ]);
    }
  }

  const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
  const today = new Date().toISOString().slice(0, 10);
  const tag = yearStr ? `-${yearStr}` : "";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="asofe-orders${tag}-${today}.csv"`,
    },
  });
}
