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

// ─── Revenue Pack: abandoned-cart + welcome offer ──────────────────────────

export async function notifyAbandonedCart(args: {
  email: string;
  items: { slug: string; size: string; qty: number; colour?: string }[];
  subtotal: number;
  recoveryToken: string;
  discountCode: string | null;
  discountPercent: number | null;
  stage: 1 | 2 | 3;
}): Promise<void> {
  const recoverUrl = `${SITE_URL}/bag?recover=${args.recoveryToken}`;
  const headline = args.stage === 1
    ? "Your bag is waiting."
    : args.stage === 2
      ? "Still thinking about it?"
      : "Last call — your bag is about to close.";

  const lines = args.items.map(i =>
    `  ${i.qty} × ${i.slug.replace(/-/g, " ")} (size ${i.size}${i.colour ? `, ${i.colour}` : ""})`
  ).join("\n");

  const discountBlock = args.discountCode && args.discountPercent
    ? [
        ``,
        `As a thank-you for coming back, here's ${args.discountPercent}% off:`,
        `    ${args.discountCode}`,
        `It applies automatically when you return via the link above. Valid 7 days.`,
      ].join("\n")
    : "";

  await send({
    to: args.email,
    subject: headline,
    text: [
      headline,
      ``,
      `You left these in your bag at Asofe:`,
      lines,
      ``,
      `Subtotal: ${formatPrice(args.subtotal)}`,
      ``,
      `Resume here: ${recoverUrl}`,
      discountBlock,
      ``,
      `If you'd rather not receive these notes, reply with the word STOP and we'll suppress this address.`,
    ].filter(Boolean).join("\n"),
  });
}

export async function notifyWelcomeOffer(args: {
  email: string;
  code: string;
  percent: number;
  expiryDays: number;
}): Promise<void> {
  await send({
    to: args.email,
    subject: `${args.percent}% off your first piece — your Asofe code`,
    text: [
      `Welcome to Asofe.`,
      ``,
      `Your code: ${args.code}`,
      `${args.percent}% off your first order. Valid ${args.expiryDays} days.`,
      ``,
      `Apply at the bag: ${SITE_URL}/bag`,
      ``,
      `We write rarely — new collections, atelier visits, the occasional considered essay.`,
    ].join("\n"),
  });
}

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

export async function notifyOrderCancelled(args: {
  orderId: string;
  customerEmail: string;
  refundAmount: number;
  reason?: string;
}): Promise<void> {
  await send({
    to: args.customerEmail,
    subject: `Your Asofe order has been cancelled — ${orderRef(args.orderId)}`,
    text: [
      `Your order ${orderRef(args.orderId)} has been cancelled at your request.`,
      ``,
      `Refund: ${formatPrice(args.refundAmount)} to the original payment method.`,
      `Most banks complete refunds in 5-10 business days.`,
      ``,
      args.reason ? `Reason recorded: ${args.reason}` : ``,
      `If this wasn't you, write to correspondence@theasofe.com straight away.`,
    ].filter(Boolean).join("\n"),
  });

  await send({
    to: ADMIN_EMAIL,
    subject: `Order cancelled — ${orderRef(args.orderId)} · refund ${formatPrice(args.refundAmount)}`,
    text: [
      `A customer has cancelled their order.`,
      ``,
      `Order: ${orderRef(args.orderId)}`,
      `Customer: ${args.customerEmail}`,
      `Refund: ${formatPrice(args.refundAmount)}`,
      args.reason ? `Reason: ${args.reason}` : ``,
      ``,
      `Open: ${SITE_URL}/admin/orders/${args.orderId}`,
    ].filter(Boolean).join("\n"),
  });
}

export async function notifyOrderDelivered(order: { id: string; customer_email: string }): Promise<void> {
  await send({
    to: order.customer_email,
    subject: `Your Asofe order has arrived`,
    text: [
      `Your order ${orderRef(order.id)} has been delivered.`,
      ``,
      `We hope the pieces find their place. Returns are open for 7 days; reply to this note if anything is amiss.`,
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

// ─── Returns ───────────────────────────────────────────────────────────────

type ReturnSummary = {
  rmaNumber: string;
  orderId: string;
  customerEmail: string;
  reason: string;
  itemsLabel: string;             // pre-rendered "2× Aso Oke Coat (M)\n1× Bazin Jacket (L)"
  refundAmount?: number;          // pence
};

export async function notifyReturnRequested(r: ReturnSummary): Promise<void> {
  await send({
    to: r.customerEmail,
    subject: `Return request received · ${r.rmaNumber}`,
    text: [
      `Thank you — we've received your return request.`,
      ``,
      `Return reference: ${r.rmaNumber}`,
      `Order: ${orderRef(r.orderId)}`,
      ``,
      `Items being returned:`,
      r.itemsLabel,
      ``,
      `Reason: ${r.reason}`,
      ``,
      `Next: post the pieces back in their original packaging to:`,
      `  Asofe Returns · ${r.rmaNumber}`,
      `  Address shared on request — write to correspondence@theasofe.com`,
      ``,
      `Once we receive the pieces and confirm condition, your refund will be processed to the original payment method (typically 5-10 business days).`,
    ].join("\n"),
  });
  await send({
    to: ADMIN_EMAIL,
    subject: `New return request · ${r.rmaNumber} · order ${orderRef(r.orderId)}`,
    text: [
      `A new return request has been initiated.`,
      ``,
      `RMA: ${r.rmaNumber}`,
      `Order: ${orderRef(r.orderId)}`,
      `Customer: ${r.customerEmail}`,
      `Reason: ${r.reason}`,
      ``,
      `Items:`,
      r.itemsLabel,
      ``,
      `Review: ${SITE_URL}/admin/returns`,
    ].join("\n"),
  });
}

export async function notifyReturnReceived(r: ReturnSummary): Promise<void> {
  await send({
    to: r.customerEmail,
    subject: `We've received your return · ${r.rmaNumber}`,
    text: [
      `Your return ${r.rmaNumber} has arrived at our London hub. We're inspecting the pieces now.`,
      ``,
      `If everything's in order, your refund will be processed within 2-3 business days; you'll receive a separate note when the money is on its way back.`,
    ].join("\n"),
  });
}

export async function notifyReturnRefunded(r: ReturnSummary): Promise<void> {
  await send({
    to: r.customerEmail,
    subject: `Refund processed · ${r.rmaNumber}`,
    text: [
      `Your return ${r.rmaNumber} has been processed.`,
      ``,
      r.refundAmount ? `Refund amount: ${formatPrice(r.refundAmount)}` : ``,
      `The refund is on its way back to your original payment method — typically 5-10 business days depending on your bank.`,
      ``,
      `Thank you for shopping with Asofe.`,
    ].filter(Boolean).join("\n"),
  });
}

export async function notifyReturnRejected(r: ReturnSummary & { rejectionReason: string }): Promise<void> {
  await send({
    to: r.customerEmail,
    subject: `Return ${r.rmaNumber} — unable to process`,
    text: [
      `We're sorry — we're unable to process your return ${r.rmaNumber}.`,
      ``,
      `Reason: ${r.rejectionReason}`,
      ``,
      `Please reply to this note if you'd like to discuss this — we read every email.`,
    ].join("\n"),
  });
}

// ─── Review prompt (post-delivery cron) ────────────────────────────────────

export async function notifyReviewPrompt(args: {
  customerEmail: string;
  orderId: string;
  items: { name: string; productSlug: string }[];
}): Promise<void> {
  if (args.items.length === 0) return;
  const itemLines = args.items
    .map(i => `  · ${i.name}\n    ${SITE_URL}/account/orders/${args.orderId}/review?product=${i.productSlug}`)
    .join("\n\n");

  await send({
    to: args.customerEmail,
    subject: `How was your Asofe order? — ${orderRef(args.orderId)}`,
    text: [
      `We hope your pieces from order ${orderRef(args.orderId)} have settled in.`,
      ``,
      `If you have a moment, a few words from you helps the next customer trust the designer — and helps the designer hear directly from the people wearing their work.`,
      ``,
      `Review your pieces:`,
      ``,
      itemLines,
      ``,
      `Or open the order: ${SITE_URL}/account/orders/${args.orderId}`,
      ``,
      `Reviews are public on the designer's piece and atelier pages. They're verified — only buyers can leave them.`,
      ``,
      `If something wasn't right, write to correspondence@theasofe.com instead and we'll make it right.`,
    ].join("\n"),
  });
}

// ─── Payouts ───────────────────────────────────────────────────────────────

export async function notifyPayoutStatement(args: {
  sellerEmail: string;
  brandName: string;
  periodStart: string;
  periodEnd: string;
  gross: number;
  refunds: number;
  commission: number;
  net: number;
  payoutId: string;
}): Promise<void> {
  await send({
    to: args.sellerEmail,
    subject: `Payout statement · ${args.brandName} · ${args.periodStart} – ${args.periodEnd}`,
    text: [
      `Your Asofe payout statement is ready.`,
      ``,
      `Period: ${args.periodStart} – ${args.periodEnd}`,
      ``,
      `  Gross sales:     ${formatPrice(args.gross)}`,
      `  Refunds:        −${formatPrice(args.refunds)}`,
      `  Commission:     −${formatPrice(args.commission)}`,
      `  ─────────────────────────────`,
      `  Owed to ${args.brandName}: ${formatPrice(args.net)}`,
      ``,
      `Statement: ${SITE_URL}/dashboard/payouts/${args.payoutId}`,
      ``,
      `Payment will be issued shortly via the route you've nominated.`,
    ].join("\n"),
  });
}

export async function notifyPayoutPaid(args: {
  sellerEmail: string;
  brandName: string;
  net: number;
  paidVia: string;
  paidRef: string;
  payoutId: string;
}): Promise<void> {
  await send({
    to: args.sellerEmail,
    subject: `Payout sent · ${formatPrice(args.net)} via ${args.paidVia}`,
    text: [
      `Your payout has been issued.`,
      ``,
      `Amount:    ${formatPrice(args.net)}`,
      `Method:    ${args.paidVia}`,
      `Reference: ${args.paidRef}`,
      ``,
      `Statement: ${SITE_URL}/dashboard/payouts/${args.payoutId}`,
    ].join("\n"),
  });
}

// ─── Concierge chat ────────────────────────────────────────────────────────

export async function notifyConciergeThreadOpened(args: {
  customerEmail: string;
  firstMessage: string;
  threadId: string;
}): Promise<void> {
  await send({
    to: ADMIN_EMAIL,
    subject: `New concierge thread · ${args.customerEmail}`,
    text: [
      `A customer has opened a concierge thread.`,
      ``,
      `Customer: ${args.customerEmail}`,
      ``,
      `First message:`,
      `${args.firstMessage}`,
      ``,
      `Reply: ${SITE_URL}/admin/concierge/${args.threadId}`,
    ].join("\n"),
  });
}

// ─── Gift cards ────────────────────────────────────────────────────────────

export async function notifyGiftCardIssued(args: {
  toEmail: string;
  toName?: string | null;
  fromName?: string | null;
  code: string;
  amountPence: number;
  message?: string | null;
  expiresAt?: string | null;
}): Promise<void> {
  const greeting = args.toName ? `Dear ${args.toName},` : `Hello,`;
  const intro = args.fromName
    ? `${args.fromName} has sent you an Asofe gift card worth ${formatPrice(args.amountPence / 100)}.`
    : `Your Asofe gift card is ready — worth ${formatPrice(args.amountPence / 100)}.`;

  await send({
    to: args.toEmail,
    subject: args.fromName
      ? `${args.fromName} sent you an Asofe gift card`
      : `Your Asofe gift card · ${formatPrice(args.amountPence / 100)}`,
    text: [
      greeting,
      ``,
      intro,
      ``,
      args.message ? `Personal note:` : ``,
      args.message ? `"${args.message}"` : ``,
      args.message ? `` : ``,
      `Your code:`,
      ``,
      `  ${args.code}`,
      ``,
      `Apply it at checkout — paste the code on the bag page and it offsets your order total.`,
      args.expiresAt ? `Valid until ${args.expiresAt}.` : ``,
      ``,
      `Begin browsing: ${SITE_URL}`,
      ``,
      `Questions? Write to correspondence@theasofe.com.`,
    ].filter(Boolean).join("\n"),
  });
}

// ─── Designer Q&A ──────────────────────────────────────────────────────────

export async function notifyDesignerQuestion(args: {
  sellerEmail: string;
  productName: string;
  productSlug: string;
  customerName: string;
  question: string;
  brandSlug: string;
}): Promise<void> {
  await send({
    to: args.sellerEmail,
    subject: `New question on ${args.productName}`,
    text: [
      `A customer has asked a question about one of your pieces.`,
      ``,
      `Piece: ${args.productName}`,
      `Customer: ${args.customerName}`,
      ``,
      `Question:`,
      `${args.question}`,
      ``,
      `Answer at: ${SITE_URL}/dashboard/questions`,
    ].join("\n"),
  });
}

export async function notifyQuestionAnswered(args: {
  customerEmail: string;
  productName: string;
  productSlug: string;
  question: string;
  answer: string;
}): Promise<void> {
  await send({
    to: args.customerEmail,
    subject: `Your question about ${args.productName} has been answered`,
    text: [
      `The designer has replied to your question about ${args.productName}.`,
      ``,
      `Your question:`,
      `${args.question}`,
      ``,
      `Designer's answer:`,
      `${args.answer}`,
      ``,
      `See the full thread (and continue browsing) at:`,
      `${SITE_URL}/products/${args.productSlug}#questions`,
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

// ─── Monthly recap (cron-fired on the 1st of each month) ───────────────────

// ─── Back in stock ─────────────────────────────────────────────────────────

export async function notifyBackInStock(args: {
  email: string;
  product: { slug: string; name: string; image?: string };
  colour: string;
  size: string;
}): Promise<void> {
  const productUrl = `${SITE_URL}/products/${args.product.slug}`;
  await send({
    to: args.email,
    subject: `Back in stock — ${args.product.name}`,
    text: [
      `${args.product.name} is back in your size.`,
      ``,
      `  Size:   ${args.size}`,
      args.colour ? `  Colour: ${args.colour}` : null,
      ``,
      `Pieces sell quickly once they return. View and add to bag:`,
      productUrl,
      ``,
      `You only receive this email once per restock. If you'd rather not, no action needed — your subscription is now closed.`,
    ].filter((l): l is string => l !== null).join("\n"),
  });
}

// ─── Cart abandonment ──────────────────────────────────────────────────────

export async function notifyCartAbandonment(args: {
  email: string;
  stage: 1 | 2 | 3;
  items: { name: string; brand: string; price: number; image?: string }[];
  subtotal: number;
  recoveryUrl: string;
  discountCode?: string;
}): Promise<void> {
  const lines = args.items
    .map(i => `  ${i.name} — ${i.brand} — ${formatPrice(i.price)}`)
    .join("\n");

  const subjects = {
    1: "Your bag is waiting at Asofe",
    2: "Still thinking? Here's what other buyers said",
    3: "A small thank-you to take your bag home",
  } as const;

  const bodies = {
    1: [
      `The pieces you chose are still in your bag.`,
      ``,
      lines,
      ``,
      `Subtotal: ${formatPrice(args.subtotal)}`,
      ``,
      `Return to your bag in one click:`,
      args.recoveryUrl,
      ``,
      `Stock at Asofe is finite — designers produce in small batches. Best to come back soon.`,
    ],
    2: [
      `Your bag is still here.`,
      ``,
      lines,
      ``,
      `Hundreds of buyers have left verified reviews for pieces on Asofe. Every order is fulfilled from our London hub with complimentary 7-day returns.`,
      ``,
      `Return to your bag:`,
      args.recoveryUrl,
    ],
    3: [
      `Last note from us about your bag.`,
      ``,
      lines,
      ``,
      args.discountCode
        ? `Use code ${args.discountCode} at checkout — £10 off, valid for 24 hours.`
        : `If we held onto a piece you wanted, we'd want to know. Reply if anything's stopping you.`,
      ``,
      `Return to your bag:`,
      args.recoveryUrl,
    ],
  } as const;

  await send({
    to: args.email,
    subject: subjects[args.stage],
    text: bodies[args.stage].join("\n"),
  });
}

export async function notifyDesignerMonthlyRecap(args: {
  sellerEmail: string;
  brandName: string;
  brandSlug: string;
  periodLabel: string;          // e.g. "May 2026"
  delivered_orders: number;
  pieces_sold: number;
  gross_pence: number;
  pending_payout_pence: number;
  top_piece: { slug: string; name: string; units: number } | null;
  top_wishlisted: { slug: string; name: string; count: number } | null;
  new_reviews: number;
  new_review_avg: number;
  pending_questions: number;
}): Promise<void> {
  const gbp = (p: number) => formatPrice(p / 100);
  const idle = args.delivered_orders === 0 && args.pieces_sold === 0;

  const lines = [
    `${args.brandName} — ${args.periodLabel} recap`,
    ``,
    idle
      ? `No deliveries this month. We'll keep the floor lit and the door open — here's what's stirring underneath.`
      : `Here's how ${args.brandName} performed across Asofe this month.`,
    ``,
    `· Sales`,
    `    Pieces sold: ${args.pieces_sold}`,
    `    Orders delivered: ${args.delivered_orders}`,
    `    Gross revenue: ${gbp(args.gross_pence)}`,
    ``,
    `· Payouts`,
    `    Building toward next statement: ${gbp(args.pending_payout_pence)}`,
    `    (Net of Asofe's commission. Settles on the next monthly cycle.)`,
    ``,
    `· Top piece this month`,
    args.top_piece
      ? `    ${args.top_piece.name} — ${args.top_piece.units} sold`
      : `    No piece led the month — variety across the catalogue.`,
    ``,
    `· What customers are watching`,
    args.top_wishlisted
      ? `    ${args.top_wishlisted.name} — ${args.top_wishlisted.count} new wishlist saves`
      : `    No new wishlist activity this month.`,
    ``,
    `· Reviews landed: ${args.new_reviews}${args.new_review_avg > 0 ? ` · average ${args.new_review_avg.toFixed(1)}★` : ""}`,
    args.pending_questions > 0
      ? `· ${args.pending_questions} customer question${args.pending_questions === 1 ? "" : "s"} awaiting your answer — please reply this week.`
      : `· No customer questions waiting.`,
    ``,
    `Full numbers: ${SITE_URL}/dashboard`,
    args.pending_questions > 0 ? `Reply to questions: ${SITE_URL}/dashboard/questions` : ``,
    ``,
    `With thanks,`,
    `Asofe`,
  ].filter(l => l !== undefined);

  await send({
    to: args.sellerEmail,
    subject: `${args.brandName} · ${args.periodLabel} recap`,
    text: lines.join("\n"),
  });
}
