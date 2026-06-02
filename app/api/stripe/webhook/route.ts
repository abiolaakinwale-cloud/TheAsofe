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

        // ── Branch: gift card purchase (no order_id) ───────────────
        if (session.metadata?.gift_card_purchase === "1") {
          const amountPence    = Number(session.metadata.amount_pence || 0);
          const recipientEmail = session.metadata.recipient_email || "";
          const recipientName  = session.metadata.recipient_name || null;
          const fromName       = session.metadata.from_name || null;
          const message        = session.metadata.message || null;
          const sendDate       = session.metadata.send_date || null;
          const purchaserId    = session.metadata.purchaser_user_id || null;
          if (!amountPence || !recipientEmail) {
            console.warn("gift-card session missing amount/recipient", session.id);
            break;
          }

          const { generateGiftCardCode } = await import("@/lib/gift-cards");
          const { notifyGiftCardIssued }  = await import("@/lib/notifications");

          const code = generateGiftCardCode();
          const expiresAt = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
          const sendImmediately = !sendDate || sendDate <= new Date().toISOString().slice(0, 10);

          const { data: card, error: cardErr } = await sb.from("gift_cards").insert({
            code,
            initial_value_pence: amountPence,
            balance_pence: amountPence,
            currency: "GBP",
            purchaser_email: session.customer_details?.email ?? null,
            purchaser_user_id: purchaserId || null,
            recipient_email: recipientEmail,
            recipient_name: recipientName,
            personal_message: message,
            scheduled_send_at: sendImmediately ? null : sendDate,
            delivered_at: sendImmediately ? new Date().toISOString() : null,
            expires_at: expiresAt,
          }).select("id").single();
          if (cardErr) {
            console.error("gift card insert failed", cardErr);
            break;
          }

          if (sendImmediately) {
            await notifyGiftCardIssued({
              toEmail: recipientEmail,
              toName: recipientName,
              fromName,
              code,
              amountPence,
              message,
              expiresAt,
            });
          }
          // For scheduled cards: a daily cron picks them up at scheduled_send_at
          // and fires notifyGiftCardIssued + stamps delivered_at. See
          // /api/cron/gift-card-delivery (TODO if scheduling is exercised).

          console.log("gift card", card.id, "issued for", recipientEmail, "code", code);
          break;
        }

        // ── Branch: regular order ──────────────────────────────────
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
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);

        // 4. Decrement stock for each line item, and fire a low-stock alert if we
        //    crossed the threshold for any (product, size) — to the seller of that brand.
        for (const item of order.order_items ?? []) {
          const colour = (item as { colour?: string | null }).colour ?? "";
          await sb.rpc("decrement_stock", {
            p_slug: item.product_slug,
            p_colour: colour,
            p_size: item.size,
            p_qty: item.qty,
          });

          const { data: stock } = await sb
            .from("stock_levels")
            .select("quantity")
            .eq("product_slug", item.product_slug)
            .eq("colour", colour)
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

        // 6. If a gift card was applied to this order, finalise the redemption
        //    by recording a gift_card_redemptions row and decrementing the
        //    card balance. Done after the order is marked paid so a webhook
        //    retry doesn't double-spend the card.
        if (order.gift_card_code && order.gift_card_discount > 0) {
          const discountPence = order.gift_card_discount * 100;
          const { data: card } = await sb
            .from("gift_cards")
            .select("id, balance_pence")
            .eq("code", order.gift_card_code)
            .maybeSingle();
          if (card && card.balance_pence >= discountPence) {
            await sb.from("gift_card_redemptions").insert({
              gift_card_id: card.id,
              order_id: order.id,
              amount_pence: discountPence,
            });
            const newBalance = card.balance_pence - discountPence;
            await sb.from("gift_cards").update({
              balance_pence: newBalance,
              status: newBalance === 0 ? "fully_redeemed" : "active",
              updated_at: new Date().toISOString(),
            }).eq("id", card.id);
          }
        }

        // 7. Referral attribution: if order.referral_code is set AND this is
        //    the customer's first paid order AND the code belongs to someone
        //    else, issue a £25 store-credit gift card to both parties + log
        //    a referrals row. Self-referral and repeat-customer flows are
        //    silently ignored.
        if (order.referral_code && order.customer_id) {
          const { data: referrer } = await sb
            .from("profiles")
            .select("id, email")
            .eq("referral_code", order.referral_code)
            .maybeSingle();

          // Has this customer paid before? (excluding the current order)
          const { count: priorPaid } = await sb
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("customer_id", order.customer_id)
            .in("status", ["paid","packed","dispatched","delivered","refunded","cancelled"])
            .neq("id", order.id);

          if (
            referrer &&
            referrer.id !== order.customer_id &&
            (priorPaid ?? 0) === 0
          ) {
            const { generateGiftCardCode } = await import("@/lib/gift-cards");
            const { REFERRAL_REWARD_PENCE } = await import("@/lib/referrals");
            const { notifyGiftCardIssued } = await import("@/lib/notifications");

            const expiresAt = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

            // Issue gift card to the referrer
            const { data: rCard } = await sb.from("gift_cards").insert({
              code: generateGiftCardCode(),
              initial_value_pence: REFERRAL_REWARD_PENCE,
              balance_pence: REFERRAL_REWARD_PENCE,
              currency: "GBP",
              recipient_email: referrer.email,
              purchaser_user_id: order.customer_id,
              personal_message: `Thank you for introducing a new customer to Asofe.`,
              delivered_at: new Date().toISOString(),
              expires_at: expiresAt,
            }).select("id").single();

            // Issue gift card to the referee (the new customer)
            const refereeEmail = session.customer_details?.email ?? order.customer_email;
            const { data: eCard } = await sb.from("gift_cards").insert({
              code: generateGiftCardCode(),
              initial_value_pence: REFERRAL_REWARD_PENCE,
              balance_pence: REFERRAL_REWARD_PENCE,
              currency: "GBP",
              recipient_email: refereeEmail,
              purchaser_user_id: referrer.id,
              personal_message: `Welcome to Asofe — a thank-you for being introduced.`,
              delivered_at: new Date().toISOString(),
              expires_at: expiresAt,
            }).select("id").single();

            await sb.from("referrals").insert({
              referrer_user_id: referrer.id,
              referee_user_id: order.customer_id,
              referee_email: refereeEmail,
              code: order.referral_code,
              status: "rewarded",
              attributed_order_id: order.id,
              reward_amount_pence: REFERRAL_REWARD_PENCE,
              referrer_gift_card_id: rCard?.id ?? null,
              referee_gift_card_id: eCard?.id ?? null,
              rewarded_at: new Date().toISOString(),
            });

            // Notify both parties of their new store credit
            if (referrer.email && rCard) {
              await notifyGiftCardIssued({
                toEmail: referrer.email,
                code: (await sb.from("gift_cards").select("code").eq("id", rCard.id).single()).data?.code ?? "",
                amountPence: REFERRAL_REWARD_PENCE,
                message: `Thank you for introducing a new customer.`,
                expiresAt,
              });
            }
            if (refereeEmail && eCard) {
              await notifyGiftCardIssued({
                toEmail: refereeEmail,
                code: (await sb.from("gift_cards").select("code").eq("id", eCard.id).single()).data?.code ?? "",
                amountPence: REFERRAL_REWARD_PENCE,
                message: `Welcome to Asofe — a thank-you for being introduced.`,
                expiresAt,
              });
            }
          }
        }

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
          .select("id, status, order_items(product_slug, colour, size, qty)")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();
        // Short-circuit when the order has already been settled by an internal
        // path — refunded by an admin (returns flow) or cancelled by the
        // customer. Both already performed their own granular stock
        // restoration before triggering the Stripe refund; the webhook
        // arriving after the fact would otherwise double-restock.
        if (!order || order.status === "refunded" || order.status === "cancelled") break;

        await sb.from("orders").update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        }).eq("id", order.id);

        for (const item of order.order_items ?? []) {
          await sb.rpc("increment_stock", {
            p_slug: item.product_slug,
            p_colour: (item as { colour?: string | null }).colour ?? "",
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
