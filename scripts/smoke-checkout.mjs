// End-to-end checkout test — runs the full pending → paid → stock-decrement
// trail by inserting a pending order in Supabase and POSTing a properly-signed
// synthetic checkout.session.completed event to the production webhook.
//
// Mirrors exactly what Stripe will do after a real card payment, but bypasses
// the browser UI. Marks the order with notes="AUTOMATED_TEST" for cleanup.
//
// Usage:
//   node scripts/smoke-checkout.mjs            run the smoke test
//   node scripts/smoke-checkout.mjs --cleanup  delete any AUTOMATED_TEST orders
//                                              and restore the stock they consumed
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_URL = "https://theasofe.vercel.app/api/stripe/webhook";

if (!STRIPE_WEBHOOK_SECRET) { console.error("missing STRIPE_WEBHOOK_SECRET"); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

// === Cleanup mode — undo any previous AUTOMATED_TEST runs ===
if (process.argv.includes("--cleanup")) {
  const { data: orders } = await sb.from("orders")
    .select("id, shipping_address_id, order_items(product_slug, colour, size, qty)")
    .eq("notes", "AUTOMATED_TEST");
  if (!orders?.length) { console.log("Nothing to clean."); process.exit(0); }
  for (const o of orders) {
    for (const i of o.order_items ?? []) {
      await sb.rpc("increment_stock", { p_slug: i.product_slug, p_colour: i.colour ?? "", p_size: i.size, p_qty: i.qty });
    }
    await sb.from("order_items").delete().eq("order_id", o.id);
    await sb.from("orders").delete().eq("id", o.id);
    if (o.shipping_address_id) await sb.from("addresses").delete().eq("id", o.shipping_address_id);
    console.log(`✓ cleaned order ${o.id.slice(0, 8)}… (stock restored, order + items + address deleted)`);
  }
  process.exit(0);
}

// === 1. Pick a real product variant with stock ===
const PRODUCT = {
  slug: "aso-oke-wrap-coat",
  name: "Aso Oke Wrap Coat",
  brand: "atelier-adunni",
  colour: "Indigo & gold",
  size: "S",
  unit_price: 2480,
};
const QTY = 1;
const SHIPPING = 25;

// Snapshot stock before
const { data: stockBefore } = await sb.from("stock_levels")
  .select("quantity, updated_at")
  .eq("product_slug", PRODUCT.slug).eq("colour", PRODUCT.colour).eq("size", PRODUCT.size).single();
console.log(`📦 Stock BEFORE: ${stockBefore.quantity}`);

// === 2. Use the demo customer (visitor role = customer-equivalent in this app) ===
const { data: customer } = await sb.from("profiles").select("id, email").eq("email", "demo.customer@theasofe.com").single();
if (!customer) { console.error("demo.customer@theasofe.com profile missing"); process.exit(1); }
console.log(`👤 Using customer: ${customer.email}`);

// === 3. Insert pending order + order_item (what the /checkout server action does) ===
const subtotal = PRODUCT.unit_price * QTY;
const { data: order, error: orderErr } = await sb.from("orders").insert({
  customer_id: customer.id,
  customer_email: customer.email,
  status: "pending",
  subtotal,
  shipping: 0,
  total: subtotal,
  currency: "GBP",
  notes: "AUTOMATED_TEST",
}).select("id").single();
if (orderErr) { console.error(orderErr); process.exit(1); }
console.log(`🆕 Pending order created: ${order.id}`);

const { error: itemErr } = await sb.from("order_items").insert({
  order_id: order.id,
  product_slug: PRODUCT.slug,
  name: PRODUCT.name,
  brand_slug: PRODUCT.brand,
  colour: PRODUCT.colour,
  size: PRODUCT.size,
  qty: QTY,
  unit_price: PRODUCT.unit_price,
});
if (itemErr) { console.error(itemErr); process.exit(1); }

// === 4. Build a synthetic Stripe checkout.session.completed event ===
const sessionId = "cs_test_smoke_" + crypto.randomBytes(12).toString("hex");
const piId = "pi_test_smoke_" + crypto.randomBytes(12).toString("hex");
const event = {
  id: "evt_test_" + crypto.randomBytes(12).toString("hex"),
  object: "event",
  api_version: "2024-11-20.acacia",
  created: Math.floor(Date.now() / 1000),
  type: "checkout.session.completed",
  data: {
    object: {
      id: sessionId,
      object: "checkout.session",
      payment_intent: piId,
      payment_status: "paid",
      status: "complete",
      amount_total: (subtotal + SHIPPING) * 100,
      currency: "gbp",
      metadata: { order_id: order.id },
      customer_details: {
        email: customer.email,
        phone: "+447700900123",
        name: "Smoke Test Customer",
      },
      collected_information: {
        shipping_details: {
          name: "Smoke Test Customer",
          address: {
            line1: "1 Editorial Way",
            line2: null,
            city: "London",
            postal_code: "SW1A 1AA",
            country: "GB",
          },
        },
      },
      shipping_cost: { amount_total: SHIPPING * 100 },
    },
  },
};

// === 5. Compute Stripe signature (t=...,v1=hmac_sha256(t.body)) ===
const body = JSON.stringify(event);
const ts = Math.floor(Date.now() / 1000);
const sig = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET)
  .update(`${ts}.${body}`)
  .digest("hex");
const stripeSignature = `t=${ts},v1=${sig}`;

console.log(`📡 POSTing signed event to ${WEBHOOK_URL}`);
const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": stripeSignature },
  body,
});
console.log(`   HTTP ${res.status}: ${await res.text()}`);

// === 6. Verify state changed ===
await new Promise(r => setTimeout(r, 1500));
const { data: orderAfter } = await sb.from("orders").select("status, stripe_payment_intent_id, total, shipping_address_id").eq("id", order.id).single();
const { data: stockAfter } = await sb.from("stock_levels")
  .select("quantity, updated_at")
  .eq("product_slug", PRODUCT.slug).eq("colour", PRODUCT.colour).eq("size", PRODUCT.size).single();

console.log(`\n━━━ RESULT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`order.status:               ${orderAfter.status}              (expected: paid)`);
console.log(`order.stripe_payment_intent_id: ${orderAfter.stripe_payment_intent_id ?? "—"}`);
console.log(`order.shipping_address_id:  ${orderAfter.shipping_address_id ?? "—"}`);
console.log(`order.total:                £${orderAfter.total}                (expected: £${subtotal + SHIPPING})`);
console.log(`stock BEFORE → AFTER:       ${stockBefore.quantity} → ${stockAfter.quantity}   (expected: ${stockBefore.quantity - QTY})`);

const ok = orderAfter.status === "paid"
  && orderAfter.stripe_payment_intent_id === piId
  && stockAfter.quantity === stockBefore.quantity - QTY;
console.log(`\n${ok ? "✅ END-TO-END PASS" : "❌ FAILURE — see above"}`);
process.exit(ok ? 0 : 1);
