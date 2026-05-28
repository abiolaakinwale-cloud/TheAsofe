import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  notifyLowStock,
  notifyOrderPlacedAdmin,
  notifyOrderPlacedCustomer,
} from "@/lib/notifications";

const LOW_STOCK_THRESHOLD = 3;

export const runtime = "nodejs";
// Webhook bodies are signed against the raw bytes — never parse before verification.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const sb = getAdminSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (!orderId) {
          console.warn("checkout.session.completed without order_id metadata", session.id);
          break;
        }

        // 1. Look up the order
        const { data: order } = await sb.from("orders").select("*, order_items(*)").eq("id", orderId).maybeSingle();
        if (!order) {
          console.warn("order not found for session", session.id, orderId);
          break;
        }
        if (order.status !== "pending") {
          // idempotency — already processed
          break;
        }

        // 2. Persist shipping address (from Stripe's collection)
        const shipping = session.collected_information?.shipping_details;
        let addressId: string | null = null;
        if (shipping?.address) {
          const { data: addr } = await sb
            .from("addresses")
            .insert({
              customer_id: order.customer_id,
              full_name: shipping.name ?? "",
              line1: shipping.address.line1 ?? "",
              line2: shipping.address.line2,
              city: shipping.address.city ?? "",
              postcode: shipping.address.postal_code ?? "",
              country: shipping.address.country ?? "GB",
              phone: session.customer_details?.phone ?? null,
            })
            .select("id")
            .single();
          addressId = addr?.id ?? null;
        }

        // 3. Mark order paid
        await sb.from("orders").update({
          status: "paid",
          customer_email: session.customer_details?.email ?? order.customer_email,
          shipping_address_id: addressId,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
          total: session.amount_total ? Math.round(session.amount_total / 100) : order.total,
          shipping: session.shipping_cost?.amount_total ? Math.round(session.shipping_cost.amount_total / 100) : 0,
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);

        // 4. Decrement stock for each line item, and fire a low-stock alert if we
        //    crossed the threshold for any (product, size) — to the seller of that brand.
        for (const item of order.order_items ?? []) {
          await sb.rpc("decrement_stock", {
            p_slug: item.product_slug,
            p_size: item.size,
            p_qty: item.qty,
          });

          const { data: stock } = await sb
            .from("stock_levels")
            .select("quantity")
            .eq("product_slug", item.product_slug)
            .eq("size", item.size)
            .maybeSingle();

          if (stock && stock.quantity <= LOW_STOCK_THRESHOLD) {
            const { data: seller } = await sb
              .from("profiles")
              .select("email")
              .eq("brand", item.brand_slug)
              .eq("role", "seller")
              .maybeSingle();
            if (seller?.email) {
              await notifyLowStock({
                sellerEmail: seller.email,
                productName: item.name,
                productSlug: item.product_slug,
                size: item.size,
                remaining: stock.quantity,
                brandSlug: item.brand_slug,
              });
            }
          }
        }

        // 5. Confirmation emails — customer + admin
        const customerEmail = session.customer_details?.email ?? order.customer_email;
        const summary = {
          id: order.id,
          customer_email: customerEmail,
          subtotal: order.subtotal,
          shipping: session.shipping_cost?.amount_total ? Math.round(session.shipping_cost.amount_total / 100) : 0,
          total: session.amount_total ? Math.round(session.amount_total / 100) : order.total,
          items: (order.order_items ?? []) as { name: string; size: string; qty: number; unit_price: number }[],
        };
        await notifyOrderPlacedCustomer(summary);
        await notifyOrderPlacedAdmin(summary);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (!paymentIntentId) break;

        const { data: order } = await sb
          .from("orders")
          .select("id, status, order_items(product_slug, size, qty)")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (!order || order.status === "refunded") break;

        await sb.from("orders").update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        }).eq("id", order.id);

        for (const item of order.order_items ?? []) {
          await sb.rpc("increment_stock", {
            p_slug: item.product_slug,
            p_size: item.size,
            p_qty: item.qty,
          });
        }
        break;
      }

      default:
        // Receive-and-ignore — Stripe needs a 2xx to mark the event delivered.
        break;
    }
  } catch (err) {
    console.error("webhook handler error", err);
    // Return 200 anyway so Stripe doesn't retry forever on a bug — but log it.
  }

  return NextResponse.json({ received: true });
}
