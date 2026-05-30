// Run AFTER paying through Stripe Checkout to see the full order trail.
// Usage: node scripts/inspect-latest-order.mjs
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: orders } = await sb
  .from("orders")
  .select("*, order_items(*), addresses:shipping_address_id(*)")
  .order("created_at", { ascending: false })
  .limit(3);

if (!orders?.length) {
  console.log("No orders yet. Pay a test checkout first.");
  process.exit(0);
}

for (const o of orders) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Order ${o.id.slice(0, 8)}…  ${o.created_at.replace("T", " ").slice(0, 16)}`);
  console.log(`  status:    ${o.status}        (✓ should be "paid" after checkout)`);
  console.log(`  email:     ${o.customer_email ?? "—"}`);
  console.log(`  subtotal:  £${o.subtotal}     shipping: £${o.shipping ?? 0}     total: £${o.total}`);
  console.log(`  stripe PI: ${o.stripe_payment_intent_id ?? "— (webhook didn't fire)"}`);

  if (o.addresses) {
    console.log(`  ship to:   ${o.addresses.full_name}, ${o.addresses.line1}${o.addresses.line2 ? ", " + o.addresses.line2 : ""}, ${o.addresses.city} ${o.addresses.postcode}, ${o.addresses.country}`);
  } else if (o.status === "paid") {
    console.log(`  ⚠ no shipping address — Stripe didn't collect or insert failed`);
  }

  console.log(`  items:`);
  for (const i of o.order_items ?? []) {
    console.log(`    · ${i.qty}× ${i.name}  [${i.product_slug}${i.colour ? " / " + i.colour : ""} / ${i.size}]  £${i.unit_price}`);

    const { data: stock } = await sb
      .from("stock_levels")
      .select("quantity, updated_at")
      .eq("product_slug", i.product_slug)
      .eq("colour", i.colour ?? "")
      .eq("size", i.size)
      .maybeSingle();
    if (stock) {
      const updatedRecently = new Date(stock.updated_at).getTime() > new Date(o.created_at).getTime();
      console.log(`        stock now: ${stock.quantity}  ${updatedRecently ? "✓ decremented by webhook" : "(unchanged — webhook may not have fired)"}`);
    } else {
      console.log(`        ⚠ no stock_levels row for this variant`);
    }
  }
}
console.log("");
