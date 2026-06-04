import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { DEFAULT_PARCEL } from "@/lib/courier/hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Royal Mail Click & Drop CSV import format. Column names below are the
// ones the importer auto-maps. Service code is left blank so the operator
// chooses it inside Click & Drop (Tracked 24 / Tracked 48 / Signed-for).
//
// Access is gated by proxy.ts (admin role required for /admin/*).
//
// Query params:
//   ?status=paid        default — exports unfulfilled paid orders
//   ?status=packed      labels for already-packed orders
//   ?ids=uuid,uuid,...  explicit order ids (overrides status)

const HEADERS = [
  "Order reference",
  "Order date",
  "Recipient name",
  "Recipient email",
  "Recipient mobile",
  "Recipient address line 1",
  "Recipient address line 2",
  "Recipient address line 3",
  "Recipient town",
  "Recipient county",
  "Recipient postcode",
  "Recipient country",
  "Weight",
  "Length",
  "Width",
  "Depth",
  "Order value",
  "Service code",
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toIsoCountry(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (v === "gb" || v === "uk" || v.includes("united kingdom") || v.includes("great britain")) return "GB";
  if (v.length === 2) return v.toUpperCase();
  return raw;
}

type AddressRow = {
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: string;
  phone: string | null;
};
type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  customer_email: string;
  addresses: AddressRow | AddressRow[] | null;
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "paid";
  const idsParam = params.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;

  const sb = getAdminSupabase();
  let q = sb
    .from("orders")
    .select(`
      id, created_at, total, customer_email,
      addresses:shipping_address_id(full_name, line1, line2, city, postcode, country, phone)
    `)
    .order("created_at", { ascending: true });

  if (ids && ids.length > 0) {
    q = q.in("id", ids);
  } else {
    q = q.eq("status", status);
  }

  const { data: orders, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const typed = (orders ?? []) as unknown as OrderRow[];

  const rows: (string | number)[][] = [HEADERS];
  for (const o of typed) {
    const addrRaw = o.addresses;
    const addr: AddressRow | null = Array.isArray(addrRaw) ? addrRaw[0] ?? null : addrRaw;
    if (!addr) continue;

    rows.push([
      o.id.slice(0, 8).toUpperCase(),
      o.created_at.slice(0, 10),
      addr.full_name,
      o.customer_email,
      addr.phone ?? "",
      addr.line1,
      addr.line2 ?? "",
      "",
      addr.city,
      "",
      addr.postcode,
      toIsoCountry(addr.country),
      (DEFAULT_PARCEL.weight_grams / 1000).toFixed(3),
      DEFAULT_PARCEL.length_cm,
      DEFAULT_PARCEL.width_cm,
      DEFAULT_PARCEL.height_cm,
      o.total.toFixed(2),
      "",
    ]);
  }

  const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
  const today = new Date().toISOString().slice(0, 10);
  const tag = ids ? "selection" : status;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="click-drop-${tag}-${today}.csv"`,
    },
  });
}
