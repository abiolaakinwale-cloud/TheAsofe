import "server-only";
import { PostHog } from "posthog-node";
import { getAdminSupabase } from "./supabase/admin";

export type AnalyticsEvent =
  | "product_view"
  | "add_to_cart"
  | "checkout_started"
  | "purchase_completed"
  | "wishlist_added"
  | "wishlist_removed"
  | "search_performed"
  | "filter_applied"
  | "back_in_stock_subscribed"
  | "bag_cross_sell_clicked"
  | "cart_abandonment_recovered"
  | "welcome_modal_opened"
  | "welcome_modal_dismissed"
  | "welcome_code_issued"
  | "discount_applied"
  | "discount_removed"
  | "shipping_threshold_reached"
  | "express_checkout_clicked"
  | "express_checkout_completed";

type Identity = { userId?: string | null; anonId?: string | null; email?: string | null };

let _ph: PostHog | null = null;
function client(): PostHog | null {
  if (_ph) return _ph;
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  _ph = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
  return _ph;
}

const distinctIdFor = (id: Identity): string =>
  id.userId ?? id.anonId ?? id.email ?? "anon";

export async function track(
  event: AnalyticsEvent,
  identity: Identity,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const ph = client();
  if (ph) {
    try {
      ph.capture({
        distinctId: distinctIdFor(identity),
        event,
        properties: {
          ...properties,
          $set: identity.email ? { email: identity.email } : undefined,
        },
      });
    } catch (err) {
      console.error(`[analytics] posthog capture failed for ${event}`, err);
    }
  }

  // Durable mirror — best-effort, never blocks the caller. Useful for admin
  // dashboards and post-hoc analysis without a PostHog round trip.
  try {
    await getAdminSupabase().from("analytics_events").insert({
      event,
      user_id: identity.userId ?? null,
      anon_id: identity.anonId ?? null,
      properties,
    });
  } catch (err) {
    console.error(`[analytics] supabase mirror failed for ${event}`, err);
  }
}

/** Call on process exit / route boundary so PostHog flushes pending events. */
export async function flushAnalytics(): Promise<void> {
  if (_ph) {
    try {
      await _ph.shutdown();
    } catch {
      /* best effort */
    } finally {
      _ph = null;
    }
  }
}
