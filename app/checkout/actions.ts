"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getStripe, isStripeConfigured, toMinor } from "@/lib/stripe";
import { getEnrichedBag } from "@/lib/bag";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { readAppliedGiftCard } from "@/app/bag/gift-card-actions";
import { readAppliedDiscount } from "@/app/bag/discount-actions";
import { shippingFor, STANDARD_SHIPPING_GBP } from "@/lib/shipping";
import { toMinor } from "@/lib/stripe";
import { track } from "@/lib/analytics";

export type CheckoutError = { ok: false; error: string };

export async function startCheckout(): Promise<CheckoutError | void> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Checkout is being configured — please try again shortly." };
  }

  const bag = await getEnrichedBag();
  if (bag.items.length === 0) {
    return { ok: false, error: "Your bag is empty." };
  }

  const sb = getAdminSupabase();
  const sbAuth = await getServerSupabase();
  const { data: { user } } = await sbAuth.auth.getUser();

  // Resolve any gift-card applied via the bag cookie. Recomputed here against
  // the bag's current state so a stale cookie can't over-redeem.
  const giftCard = await readAppliedGiftCard();
  const giftDiscountPounds = giftCard ? Math.floor(giftCard.applicable_pence / 100) : 0;

  // Resolve any single-use discount code (welcome/recovery). Re-validated
  // here so first-order rules + expiry are checked at the actual checkout.
  const discount = await readAppliedDiscount();
  const discountPounds = discount ? Math.floor(discount.discountPence / 100) : 0;

  // Shipping economics: free over the threshold, otherwise a flat charge.
  const shipping = shippingFor(bag.subtotal);

  // Pick up the referral cookie (set by proxy.ts on /?ref=CODE landings).
  // We don't validate the code here — finalisation in the webhook checks
  // the code exists and the referee isn't the referrer themselves.
  const { cookies } = await import("next/headers");
  const cookieJar = await cookies();
  const referralCode = cookieJar.get("ref")?.value?.toUpperCase() ?? null;

  // 1. Create an order row in 'pending'. Items snapshot price/name/brand so a
  //    later product edit doesn't change historical orders.
  const { data: order, error: orderErr } = await sb
    .from("orders")
    .insert({
      customer_id: user?.id ?? null,
      customer_email: user?.email ?? "guest@asofe.local", // placeholder; Stripe captures the real email
      subtotal: bag.subtotal,
      total: Math.max(0, bag.subtotal + shipping.charge - giftDiscountPounds - discountPounds),
      shipping: shipping.charge,
      currency: "GBP",
      status: "pending",
      gift_card_code: giftCard?.code ?? null,
      gift_card_discount: giftDiscountPounds,
      discount_code:     discount?.code ?? null,
      discount_amount:   discountPounds,
      referral_code: referralCode,
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    console.error("order insert failed", orderErr);
    return { ok: false, error: "Could not start your order. Please try again." };
  }

  const items = bag.items.map(it => {
    const isBackorder = !!it.product.madeToOrder && it.stock === 0;
    return {
      order_id: order.id,
      product_slug: it.slug,
      brand_slug: it.product.brand,
      name: it.product.name,
      colour: it.colour || null,
      size: it.size,
      qty: it.qty,
      unit_price: it.product.price,
      lead_time_weeks: isBackorder ? it.product.leadTimeWeeks ?? null : null,
    };
  });

  const { error: itemsErr } = await sb.from("order_items").insert(items);
  if (itemsErr) {
    console.error("order_items insert failed", itemsErr);
    return { ok: false, error: "Could not start your order. Please try again." };
  }

  // 2. Create a Stripe Checkout Session. Pass order_id as metadata so the
  //    webhook can find this order when payment completes.
  const stripe = getStripe();
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("host") ?? "theasofe.vercel.app";
  const origin = `${proto}://${host}`;

  // If a gift card is applied, create a single-use Stripe coupon for the
  // exact discount and reference it on the session. Combine with any
  // discount code into a SINGLE amount_off coupon — Stripe only accepts one
  // discount per session, so we sum the two.
  const totalDiscountPence = (giftCard?.applicable_pence ?? 0) + (discount?.discountPence ?? 0);
  let stripeDiscount: { coupon: string } | undefined;
  if (totalDiscountPence > 0) {
    try {
      const label = [
        giftCard ? `Gift ${giftCard.code.slice(-9)}` : null,
        discount ? `${discount.kind === "percent" ? `${discount.value}% off` : "Discount"}` : null,
      ].filter(Boolean).join(" + ");
      const coupon = await stripe.coupons.create({
        amount_off: totalDiscountPence,
        currency: "gbp",
        duration: "once",
        name: label || "Discount",
        metadata: {
          order_id: order.id,
          ...(giftCard && { gift_card_code: giftCard.code, gift_card_pence: String(giftCard.applicable_pence) }),
          ...(discount && { discount_code: discount.code, discount_pence: String(discount.discountPence) }),
        },
      });
      stripeDiscount = { coupon: coupon.id };
    } catch (err) {
      console.error("stripe coupon create failed", err);
    }
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      discounts: stripeDiscount ? [stripeDiscount] : undefined,
      line_items: bag.items.map(it => ({
        price_data: {
          currency: "gbp",
          unit_amount: toMinor(it.product.price),
          product_data: {
            name: it.product.name,
            description: [it.brand?.name, it.colour, `Size ${it.size}`].filter(Boolean).join(" · "),
            images: it.product.images.slice(0, 1),
            metadata: {
              product_slug: it.slug,
              size: it.size,
              brand_slug: it.product.brand,
            },
          },
        },
        quantity: it.qty,
      })),
      metadata: {
        order_id: order.id,
        ...(giftCard && { gift_card_code: giftCard.code, gift_card_discount_pence: String(giftCard.applicable_pence) }),
        ...(discount && { discount_code: discount.code, discount_pence: String(discount.discountPence) }),
      },
      shipping_options: shipping.qualifies
        ? [{
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: "Complimentary UK delivery",
              fixed_amount: { amount: 0, currency: "gbp" },
              delivery_estimate: { minimum: { unit: "business_day", value: 2 }, maximum: { unit: "business_day", value: 4 } },
            },
          }]
        : [{
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: "UK standard delivery",
              fixed_amount: { amount: toMinor(STANDARD_SHIPPING_GBP), currency: "gbp" },
              delivery_estimate: { minimum: { unit: "business_day", value: 2 }, maximum: { unit: "business_day", value: 4 } },
            },
          }],
      payment_intent_data: { metadata: { order_id: order.id } },
      shipping_address_collection: {
        allowed_countries: ["GB", "IE", "FR", "DE", "NL", "BE", "IT", "ES", "US", "CA"],
      },
      phone_number_collection: { enabled: true },
      billing_address_collection: "required",
      customer_email: user?.email,
      success_url: `${origin}/orders/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bag`,
    });
  } catch (err) {
    console.error("stripe session create failed", err);
    return { ok: false, error: "We couldn't reach Stripe. Please try again." };
  }

  if (!session.url) {
    return { ok: false, error: "Stripe returned no checkout URL." };
  }

  // Save the session id on the order for traceability.
  await sb.from("orders").update({ stripe_payment_intent_id: session.id }).eq("id", order.id);

  await track("checkout_started", { userId: user?.id ?? null, email: user?.email ?? null }, {
    order_id:      order.id,
    subtotal:      bag.subtotal,
    discount_code: discount?.code ?? null,
    discount:     discountPounds,
    gift_card:     giftDiscountPounds,
    shipping:      shipping.charge,
    items:         bag.items.length,
    qualifies_free_shipping: shipping.qualifies,
  });

  redirect(session.url);
}
