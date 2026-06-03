"use client";

import { useEffect, useState } from "react";
import { Elements, ExpressCheckoutElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { trackClient } from "@/components/PostHogProvider";

// Mounts Apple Pay / Google Pay / Stripe Link in a single Stripe-managed
// button. Falls back to the existing CheckoutButton when the wallet APIs
// aren't available (no Apple Pay on Android, no Google Pay on iOS, etc).

const KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<Stripe | null> | null = null;
function stripeJs(): Promise<Stripe | null> {
  if (!KEY) return Promise.resolve(null);
  if (!stripePromise) stripePromise = loadStripe(KEY);
  return stripePromise;
}

export default function ExpressCheckout({ amountPence }: { amountPence: number }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let aborted = false;
    fetch("/api/payment-intent", { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (aborted) return;
        if (data.ok && data.clientSecret) setClientSecret(data.clientSecret);
        else setUnavailable(true);
      })
      .catch(() => !aborted && setUnavailable(true));
    return () => { aborted = true; };
  }, []);

  if (!KEY || unavailable) return null;
  if (!clientSecret) {
    return (
      <div className="h-12 w-full mb-4 animate-pulse" style={{ backgroundColor: "var(--color-rule)" }} />
    );
  }

  return (
    <Elements
      stripe={stripeJs()}
      options={{
        clientSecret,
        appearance: { theme: "flat", variables: { colorPrimary: "#1a1815" } },
      }}
    >
      <ExpressInner amountPence={amountPence} />
    </Elements>
  );
}

function ExpressInner({ amountPence }: { amountPence: number }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    if (!stripe || !elements) return;
    trackClient("express_checkout_clicked", { amount_pence: amountPence });
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/confirmation?express=1`,
      },
    });
    if (error) setError(error.message ?? "Payment failed");
  }

  return (
    <div className="mb-4">
      <ExpressCheckoutElement
        onConfirm={onConfirm}
        onReady={({ availablePaymentMethods }) => {
          // No wallets available — let the parent UI hide the divider too.
          if (!availablePaymentMethods) document.documentElement.dataset.noExpress = "1";
        }}
        options={{
          buttonHeight: 48,
          paymentMethods: { applePay: "always", googlePay: "always", link: "auto" },
        }}
      />
      {error && (
        <p className="text-sm mt-3" role="alert" style={{ color: "var(--color-oxblood)" }}>{error}</p>
      )}
      <div className="my-4 flex items-center gap-3 text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--color-muted)" }}>
        <span className="flex-1 h-px" style={{ backgroundColor: "var(--color-rule)" }} />
        OR
        <span className="flex-1 h-px" style={{ backgroundColor: "var(--color-rule)" }} />
      </div>
    </div>
  );
}
