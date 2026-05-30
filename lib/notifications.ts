import "server-only";
import { Resend } from "resend";
import { formatPrice } from "./data";

// Sender. Swap to onboarding@theasofe.com after the domain is verified in Resend.
const FROM = "Asofe <orders@resend.dev>";
const ADMIN_EMAIL = "correspondence@theasofe.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://theasofe.vercel.app";

type Email = { to: string | string[]; subject: string; text: string; replyTo?: string };

async function send(e: Email): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[notifications] skipped (no RESEND_API_KEY): "${e.subject}"`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      to: Array.isArray(e.to) ? e.to : [e.to],
      subject: e.subject,
      text: e.text,
      replyTo: e.replyTo,
    });
  } catch (err) {
    // Best-effort: never throw upstream so the actual action (order, status change) still completes.
    console.error(`[notifications] send failed: "${e.subject}"`, err);
  }
}

const orderRef = (id: string) => id.slice(0, 8).toUpperCase();

// ─── Applications ──────────────────────────────────────────────────────────

export async function notifyApplicationSubmitted(app: {
  id: string;
  brand_name: string;
  founder_name: string;
  instagram_handle: string;
  product_category: string;
  monthly_inventory_estimate: string;
  whatsapp_number: string;
  website: string | null;
}): Promise<void> {
  await send({
    to: ADMIN_EMAIL,
    subject: `New brand application — ${app.brand_name}`,
    text: [
      `A new house has applied to join Asofe.`,
      ``,
      `Brand: ${app.brand_name}`,
      `Founder: ${app.founder_name}`,
      `Instagram: ${app.instagram_handle}`,
      `Category: ${app.product_category}`,
      `Monthly inventory: ${app.monthly_inventory_estimate}`,
      `WhatsApp: ${app.whatsapp_number}`,
      `Website: ${app.website || "—"}`,
      ``,
      `Review: ${SITE_URL}/admin/applications`,
      `Application id: ${app.id}`,
    ].join("\n"),
  });
}

// ─── Orders ────────────────────────────────────────────────────────────────

type OrderLine = { name: string; size: string; qty: number; unit_price: number };
type OrderSummary = {
  id: string;
  customer_email: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: OrderLine[];
};

function renderLines(items: OrderLine[]): string {
  return items
    .map(i => `  ${i.qty} × ${i.name} (size ${i.size}) — ${formatPrice(i.unit_price * i.qty)}`)
    .join("\n");
}

export async function notifyOrderPlacedCustomer(order: OrderSummary): Promise<void> {
  await send({
    to: order.customer_email,
    subject: `Your Asofe order — ${orderRef(order.id)}`,
    text: [
      `Thank you for your order from Asofe.`,
      ``,
      `Order #${orderRef(order.id)}`,
      ``,
      renderLines(order.items),
      ``,
      `Subtotal: ${formatPrice(order.subtotal)}`,
      order.shipping > 0 ? `Shipping: ${formatPrice(order.shipping)}` : `Shipping: Free`,
      `Total: ${formatPrice(order.total)}`,
      ``,
      `We'll write again when your pieces leave the UK hub.`,
    ].join("\n"),
  });
}

export async function notifyOrderPlacedAdmin(order: OrderSummary): Promise<void> {
  await send({
    to: ADMIN_EMAIL,
    subject: `New order — ${orderRef(order.id)} · ${formatPrice(order.total)}`,
    text: [
      `A new order has been placed.`,
      ``,
      `Order #${orderRef(order.id)}`,
      `Customer: ${order.customer_email}`,
      `Total: ${formatPrice(order.total)}`,
      ``,
      renderLines(order.items),
      ``,
      `Open: ${SITE_URL}/admin/orders/${order.id}`,
    ].join("\n"),
  });
}

export async function notifyOrderPacked(order: { id: string; customer_email: string }): Promise<void> {
  await send({
    to: order.customer_email,
    subject: `Your Asofe order is being prepared`,
    text: [
      `Your order ${orderRef(order.id)} has been packed and is awaiting collection at our UK hub.`,
      ``,
      `We'll be in touch again the moment it leaves us.`,
    ].join("\n"),
  });
}

export async function notifyOrderDispatched(order: { id: string; customer_email: string }): Promise<void> {
  await send({
    to: order.customer_email,
    subject: `Your Asofe order is on its way`,
    text: [
      `Your order ${orderRef(order.id)} has left our UK hub and is on its way to you.`,
      ``,
      `We'll let you know when it arrives. If you have a question in the meantime, simply reply to this note.`,
    ].join("\n"),
  });
}

export async function notifyOrderDelivered(order: { id: string; customer_email: string }): Promise<void> {
  await send({
    to: order.customer_email,
    subject: `Your Asofe order has arrived`,
    text: [
      `Your order ${orderRef(order.id)} has been delivered.`,
      ``,
      `We hope the pieces find their place. Returns are open for 28 days; reply to this note if anything is amiss.`,
      ``,
      `For new arrivals and atelier notes: ${SITE_URL}/editorial`,
    ].join("\n"),
  });
}

// ─── Shipments ─────────────────────────────────────────────────────────────

export async function notifyShipmentArrived(args: {
  sellerEmail: string;
  shipmentId: string;
}): Promise<void> {
  await send({
    to: args.sellerEmail,
    subject: `Your consignment has reached the UK hub`,
    text: [
      `Your consignment ${args.shipmentId.slice(0, 8).toUpperCase()} has arrived at our London facility.`,
      ``,
      `We'll induct the pieces over the next 24 hours and confirm the received counts.`,
      ``,
      `Track: ${SITE_URL}/dashboard/shipments`,
    ].join("\n"),
  });
}

export async function notifyShipmentInducted(args: {
  sellerEmail: string;
  shipmentId: string;
  itemsInducted: number;
}): Promise<void> {
  await send({
    to: args.sellerEmail,
    subject: `Your consignment is now in stock`,
    text: [
      `Your consignment ${args.shipmentId.slice(0, 8).toUpperCase()} has been counted in.`,
      ``,
      `${args.itemsInducted} pieces are now live on Asofe and ready to ship.`,
      ``,
      `View stock: ${SITE_URL}/dashboard/products`,
    ].join("\n"),
  });
}

// ─── Low stock ─────────────────────────────────────────────────────────────

export async function notifyLowStock(args: {
  sellerEmail: string;
  productName: string;
  productSlug: string;
  size: string;
  remaining: number;
  brandSlug: string;
}): Promise<void> {
  await send({
    to: args.sellerEmail,
    subject: `Low stock — ${args.productName} (size ${args.size})`,
    text: [
      `Your inventory at the Asofe UK hub is running low.`,
      ``,
      `${args.productName} — size ${args.size}: ${args.remaining} left.`,
      ``,
      `Replenish from the studio when you can, and we'll induct the next consignment on arrival.`,
      ``,
      `Manage stock: ${SITE_URL}/dashboard/products/${args.productSlug}/edit`,
    ].join("\n"),
  });
}
