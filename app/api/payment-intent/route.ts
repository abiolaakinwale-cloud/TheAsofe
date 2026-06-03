import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured, toMinor } from "@/lib/stripe";
import { getEnrichedBag } from "@/lib/bag";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { readAppliedGiftCard } from "@/app/bag/gift-card-actions";
import { readAppliedDiscount } from "@/app/bag/discount-actions";
import { shippingFor } from "@/lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints a PaymentIntent for the ExpressCheckoutElement on /bag. Mirrors the
 * pricing logic in startCheckout() so the express path stays consistent with
 * the redirect-to-Stripe path: same subtotal, shipping, discount, gift card.
 *
 * Returns the client_secret + amount; the bag-side ExpressCheckoutElement
 * confirms the intent and we finalise via webhook (same path as Checkout
 * Session) so order_id metadata is the only thing we have to set here.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 503 });
  }

  const bag = await getEnrichedBag();
  if (bag.items.length === 0) {
    return NextResponse.json({ ok: false, error: "Empty bag" }, { status: 400 });
  }

  const sb = getAdminSupabase();
  const sbAuth = await getServerSupabase();
  const { data: { user } } = await sbAuth.auth.getUser();

  const giftCard = await readAppliedGiftCard();
  const giftPence = giftCard?.applicable_pence ?? 0;
  const discount  = await readAppliedDiscount();
  const discountPence = discount?.discountPence ?? 0;
  const shipping = shippingFor(bag.subtotal);

  // Same order shape as startCheckout — webhook treats both paths identically.
  const { data: order, error: orderErr } = await sb.from("orders").insert({
    customer_id:         user?.id ?? null,
    customer_email:      user?.email ?? "guest@asofe.local",
    subtotal:            bag.subtotal,
    total:               Math.max(0, bag.subtotal + shipping.charge - Math.floor(giftPence / 100) - Math.floor(discountPence / 100)),
    shipping:            shipping.charge,
    currency:            "GBP",
    status:              "pending",
    gift_card_code:      giftCard?.code ?? null,
    gift_card_discount:  Math.floor(giftPence / 100),
    discount_code:       discount?.code ?? null,
    discount_amount:     Math.floor(discountPence / 100),
  }).select("id").single();
  if (orderErr || !order) {
    return NextResponse.json({ ok: false, error: "Order init failed" }, { status: 500 });
  }

  const items = bag.items.map(it => ({
    order_id:     order.id,
    product_slug: it.slug,
    brand_slug:   it.product.brand,
    name:         it.product.name,
    colour:       it.colour || null,
    size:         it.size,
    qty:          it.qty,
    unit_price:   it.product.price,
  }));
  await sb.from("order_items").insert(items);

  const stripe = getStripe();
  const amountPence = toMinor(bag.subtotal + shipping.charge) - giftPence - discountPence;
  const intent = await stripe.paymentIntents.create({
    amount:   Math.max(50, amountPence),  // Stripe minimum
    currency: "gbp",
    automatic_payment_methods: { enabled: true },
    metadata: {
      order_id: order.id,
      ...(giftCard && { gift_card_code: giftCard.code }),
      ...(discount && { discount_code: discount.code }),
    },
  });

  await sb.from("orders").update({ stripe_payment_intent_id: intent.id }).eq("id", order.id);

  return NextResponse.json({
    ok: true,
    clientSecret: intent.client_secret,
    amount: intent.amount,
    orderId: order.id,
  });
}
