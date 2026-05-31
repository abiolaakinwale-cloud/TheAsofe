// Designer payout calculation. Pre-launch defaults: 30% commission, payout
// computed on delivered orders within the period (gives time for returns).
// Refunds within the same period offset the gross amount.

import { getAdminSupabase } from "@/lib/supabase/admin";

export const DEFAULT_COMMISSION_RATE = 0.30;

export type PayoutPreviewLine = {
  order_id: string;
  order_item_id: string;
  product_slug: string;
  product_name: string;
  qty: number;
  unit_price: number;
  gross_amount: number;
  refund_amount: number;
  commission_rate: number;
  net_amount: number;
  delivered_at: string;
};

export type PayoutPreview = {
  brand: string;
  brandName: string;
  commissionRate: number;
  periodStart: string;
  periodEnd: string;
  lines: PayoutPreviewLine[];
  gross: number;
  refunds: number;
  commission: number;
  net: number;
};

/**
 * Compute what a payout WOULD be for one brand over a period — does not
 * persist anything. Use this for the "preview" step before generating.
 *
 * Eligibility: order.status = 'delivered' AND updated_at within [start, end].
 * Refunds: full-order refunds within the period count as a negative offset
 * against any of the brand's items in the order. (For partial refunds via
 * returns, the return.refund_amount is allocated pro-rata.)
 */
export async function previewPayout(
  brandSlug: string,
  periodStartISO: string,   // YYYY-MM-DD
  periodEndISO: string,
): Promise<PayoutPreview> {
  const sb = getAdminSupabase();

  const { data: brand } = await sb
    .from("brands")
    .select("slug, name, commission_rate")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) throw new Error(`Brand "${brandSlug}" not found.`);
  const commissionRate = Number(brand.commission_rate ?? DEFAULT_COMMISSION_RATE);

  // Window for delivered orders, inclusive of both ends.
  const fromTs = `${periodStartISO}T00:00:00Z`;
  const toTs   = `${periodEndISO}T23:59:59.999Z`;

  // Eligible deliveries
  const { data: orders } = await sb
    .from("orders")
    .select("id, status, updated_at, currency, total")
    .eq("status", "delivered")
    .gte("updated_at", fromTs)
    .lte("updated_at", toTs);

  const orderIds = (orders ?? []).map(o => o.id);

  // Any refund within the period that touches this brand's items
  const { data: refunds } = await sb
    .from("returns")
    .select("id, order_id, refund_amount, refunded_at, status")
    .eq("status", "refunded")
    .gte("refunded_at", fromTs)
    .lte("refunded_at", toTs);

  // Refunded order_items via return_items
  const refundedItemQtyByOrderItem = new Map<string, number>();
  const refundedOrderIds = new Set((refunds ?? []).map(r => r.order_id));
  if (refunds?.length) {
    const { data: rItems } = await sb
      .from("return_items")
      .select("return_id, order_item_id, qty")
      .in("return_id", refunds.map(r => r.id));
    for (const ri of rItems ?? []) {
      refundedItemQtyByOrderItem.set(
        ri.order_item_id,
        (refundedItemQtyByOrderItem.get(ri.order_item_id) ?? 0) + ri.qty
      );
    }
  }

  // Pull this brand's lines from both eligible orders AND refunded ones in window
  const relevantOrderIds = Array.from(new Set([...orderIds, ...refundedOrderIds]));
  if (relevantOrderIds.length === 0) {
    return {
      brand: brand.slug,
      brandName: brand.name,
      commissionRate,
      periodStart: periodStartISO,
      periodEnd: periodEndISO,
      lines: [],
      gross: 0,
      refunds: 0,
      commission: 0,
      net: 0,
    };
  }

  const { data: items } = await sb
    .from("order_items")
    .select("id, order_id, product_slug, name, qty, unit_price, brand_slug")
    .eq("brand_slug", brandSlug)
    .in("order_id", relevantOrderIds);

  const ordersById = new Map((orders ?? []).map(o => [o.id, o]));

  const lines: PayoutPreviewLine[] = [];
  for (const it of items ?? []) {
    const order = ordersById.get(it.order_id);
    const isDelivered = !!order;
    const refundedQty = refundedItemQtyByOrderItem.get(it.id) ?? 0;

    const gross  = isDelivered ? it.qty * it.unit_price : 0;
    const refund = refundedQty * it.unit_price;
    const netBeforeCommission = gross - refund;
    const net    = Math.round(netBeforeCommission * (1 - commissionRate));

    // Skip lines that contribute nothing (no delivery, no refund)
    if (gross === 0 && refund === 0) continue;

    lines.push({
      order_id: it.order_id,
      order_item_id: it.id,
      product_slug: it.product_slug,
      product_name: it.name,
      qty: it.qty,
      unit_price: it.unit_price,
      gross_amount: gross,
      refund_amount: refund,
      commission_rate: commissionRate,
      net_amount: net,
      delivered_at: order?.updated_at ?? "",
    });
  }

  const gross = lines.reduce((s, l) => s + l.gross_amount, 0);
  const refundsTotal = lines.reduce((s, l) => s + l.refund_amount, 0);
  const commission = Math.round((gross - refundsTotal) * commissionRate);
  const net = (gross - refundsTotal) - commission;

  return {
    brand: brand.slug,
    brandName: brand.name,
    commissionRate,
    periodStart: periodStartISO,
    periodEnd: periodEndISO,
    lines,
    gross,
    refunds: refundsTotal,
    commission,
    net,
  };
}

export function lastMonthRange(now: Date = new Date()): { start: string; end: string } {
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const firstOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastOfLastMonth  = new Date(firstOfThisMonth.getTime() - 86_400_000);
  return {
    start: firstOfLastMonth.toISOString().slice(0, 10),
    end:   lastOfLastMonth.toISOString().slice(0, 10),
  };
}
