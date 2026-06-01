"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";
import { MIN_GIFT_AMOUNT_PENCE, MAX_GIFT_AMOUNT_PENCE } from "@/lib/gift-cards";

/**
 * Kick off a Stripe Checkout for a gift card. The actual card is created on
 * payment success by the webhook (which writes the gift_cards row + emails
 * the code). Until then we just need Stripe to hold the funds.
 */
export async function purchaseGiftCard(formData: FormData) {
  if (!isStripeConfigured()) throw new Error("Payments are temporarily unavailable.");

  const amountStr     = String(formData.get("amount") || "");
  const customAmount  = String(formData.get("custom_amount") || "").trim();
  const recipientEmail = String(formData.get("recipient_email") || "").trim().toLowerCase();
  const recipientName  = String(formData.get("recipient_name") || "").trim();
  const fromName       = String(formData.get("from_name") || "").trim();
  const message        = String(formData.get("message") || "").trim().slice(0, 500);
  const sendDate       = String(formData.get("send_date") || "").trim();          // YYYY-MM-DD, optional

  // Resolve amount: standard pre-set OR custom
  const amountPence = customAmount
    ? Math.round(Number(customAmount) * 100)
    : Number(amountStr);
  if (!Number.isFinite(amountPence) || amountPence < MIN_GIFT_AMOUNT_PENCE || amountPence > MAX_GIFT_AMOUNT_PENCE) {
    redirect(`/gift-cards?error=${encodeURIComponent(`Gift amount must be between £${MIN_GIFT_AMOUNT_PENCE / 100} and £${MAX_GIFT_AMOUNT_PENCE / 100}.`)}`);
  }
  if (!recipientEmail.includes("@")) {
    redirect(`/gift-cards?error=${encodeURIComponent("Recipient email is required.")}`);
  }

  // Optional caller — capture for the dashboard view but the gift can go to anyone
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${SITE_URL}/gift-cards/sent?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${SITE_URL}/gift-cards?cancelled=1`,
    customer_email: user?.email ?? undefined,
    line_items: [{
      price_data: {
        currency: "gbp",
        unit_amount: amountPence,
        product_data: {
          name: `Asofe gift card · ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amountPence / 100)}`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      gift_card_purchase: "1",
      amount_pence: String(amountPence),
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      from_name: fromName,
      message: message.slice(0, 400),
      send_date: sendDate,
      purchaser_user_id: user?.id ?? "",
    },
  });

  if (!session.url) throw new Error("Stripe didn't return a checkout URL.");
  redirect(session.url);
}
