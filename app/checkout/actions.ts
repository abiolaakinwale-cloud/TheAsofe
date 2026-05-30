"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getStripe, isStripeConfigured, toMinor } from "@/lib/stripe";
import { getEnrichedBag } from "@/lib/bag";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

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

  // 1. Create an order row in 'pending'. Items snapshot price/name/brand so a
  //    later product edit doesn't change historical orders.
  const { data: order, error: orderErr } = await sb
    .from("orders")
    .insert({
      customer_id: user?.id ?? null,
      customer_email: user?.email ?? "guest@asofe.local", // placeholder; Stripe captures the real email
      subtotal: bag.subtotal,
      total: bag.subtotal,
      shipping: 0,
      currency: "GBP",
      status: "pending",
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    console.error("order insert failed", orderErr);
    return { ok: false, error: "Could not start your order. Please try again." };
  }

  const items = bag.items.map(it => {
    // Snapshot the lead time at order time *only* if the line is genuinely
    // backordered (product is made-to-order AND the size has no on-hand stock).
    const isBackorder = !!it.product.madeToOrder && it.stock === 0;
    return {
      order_id: order.id,
      product_slug: it.slug,
      brand_slug: it.product.brand,
      name: it.product.name,
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

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: bag.items.map(it => ({
        price_data: {
          currency: "gbp",
          unit_amount: toMinor(it.product.price),
          product_data: {
            name: it.product.name,
            description: [it.brand?.name, `Size ${it.size}`].filter(Boolean).join(" · "),
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
      metadata: { order_id: order.id },
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

  redirect(session.url);
}
