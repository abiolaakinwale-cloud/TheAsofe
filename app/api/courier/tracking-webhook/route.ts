import { NextResponse, type NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getCourierProvider } from "@/lib/courier";
import { notifyOrderDelivered, notifyOrderDispatched } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Courier tracking webhook. The aggregator (Shippo) posts here on every
 * status change for any parcel we created. We correlate via label_parcel_id
 * to find the order, then advance the order state appropriately:
 *
 *   pre_transit | transit  → ensure status is at least "dispatched"
 *   delivered              → flip to "delivered" + stamp delivered_at + email
 *   returned | failure     → leave a note in orders.notes; admin handles it
 *
 * Configure in Shippo dashboard (once SHIPPO_API_TOKEN is live):
 *   URL    https://www.theasofe.com/api/courier/tracking-webhook
 *   Event  track_updated
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const provider = getCourierProvider();
  const update = provider.parseTrackingWebhook(rawBody, request.headers);
  if (!update) return NextResponse.json({ ok: true, processed: false }, { status: 200 });

  const sb = getAdminSupabase();
  const { data: order } = await sb
    .from("orders")
    .select("id, status, customer_email, dispatched_at, delivered_at")
    .eq("label_parcel_id", update.parcelId)
    .maybeSingle();
  if (!order) {
    // Unknown parcel — ack so the courier doesn't retry forever
    return NextResponse.json({ ok: true, processed: false, reason: "parcel not found" });
  }

  const now = new Date().toISOString();

  if (update.status === "transit" || update.status === "pre_transit") {
    if (order.status === "paid" || order.status === "packed") {
      await sb.from("orders").update({
        status: "dispatched",
        dispatched_at: order.dispatched_at ?? now,
        updated_at: now,
      }).eq("id", order.id);
      if (order.customer_email) {
        await notifyOrderDispatched({ id: order.id, customer_email: order.customer_email });
      }
      await logAction({
        action: "order.dispatched_by_webhook",
        targetType: "order",
        targetId: order.id,
        metadata: { tracking_ref: update.trackingRef, status_message: update.message },
      });
    }
  }

  if (update.status === "delivered") {
    if (order.status !== "delivered") {
      await sb.from("orders").update({
        status: "delivered",
        delivered_at: order.delivered_at ?? now,
        updated_at: now,
      }).eq("id", order.id);
      if (order.customer_email) {
        await notifyOrderDelivered({ id: order.id, customer_email: order.customer_email });
      }
      await logAction({
        action: "order.delivered_by_webhook",
        targetType: "order",
        targetId: order.id,
        metadata: { tracking_ref: update.trackingRef, location: update.location },
      });
    }
  }

  if (update.status === "returned" || update.status === "failure") {
    await sb.from("orders").update({
      notes: `Tracking event ${update.status} at ${update.timestamp}: ${update.message}${update.location ? ` (${update.location})` : ""}`,
      updated_at: now,
    }).eq("id", order.id);
    await logAction({
      action: "order.tracking_anomaly",
      targetType: "order",
      targetId: order.id,
      metadata: { status: update.status, message: update.message },
    });
  }

  return NextResponse.json({ ok: true, processed: true });
}
