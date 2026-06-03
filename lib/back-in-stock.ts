import "server-only";
import { getServerSupabase } from "./supabase/server";
import { getAdminSupabase } from "./supabase/admin";
import { notifyBackInStock } from "./notifications";

export type BackInStockSubscription = {
  productSlug: string;
  colour: string;
  size: string;
  email: string;
};

export class BackInStockError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Subscribe to a back-in-stock notification. Uses the signed-in user's email
 * when available; otherwise the explicit `email` argument (for guest PDP).
 * Idempotent — the partial unique index on (email, slug, colour, size) where
 * notified_at and unsubscribed_at are null catches duplicate subscriptions.
 */
export async function subscribeBackInStock(
  sub: BackInStockSubscription,
): Promise<{ alreadySubscribed: boolean }> {
  if (!sub.productSlug || !sub.size) {
    throw new BackInStockError("Missing product or size.");
  }
  const email = sub.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    throw new BackInStockError("Enter a valid email address.");
  }

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();

  const admin = getAdminSupabase();
  const { error } = await admin
    .from("back_in_stock_notifications")
    .insert({
      user_id: user?.id ?? null,
      email,
      product_slug: sub.productSlug,
      colour: sub.colour ?? "",
      size: sub.size,
    });

  if (error) {
    if (error.code === "23505") {
      return { alreadySubscribed: true };
    }
    throw new BackInStockError(error.message);
  }
  return { alreadySubscribed: false };
}

type Pending = {
  id: number;
  email: string;
  product_slug: string;
  colour: string;
  size: string;
};

/**
 * Called after a stock increment for a specific (slug, colour, size). Sends
 * one email per pending subscriber and stamps notified_at so each subscriber
 * is paged once per restock event.
 */
export async function dispatchBackInStockFor(
  slug: string,
  colour: string,
  size: string,
): Promise<number> {
  const admin = getAdminSupabase();
  const { data: pending } = await admin
    .from("back_in_stock_notifications")
    .select("id, email, product_slug, colour, size")
    .eq("product_slug", slug)
    .eq("colour", colour ?? "")
    .eq("size", size)
    .is("notified_at", null)
    .is("unsubscribed_at", null);

  const rows = (pending ?? []) as Pending[];
  if (rows.length === 0) return 0;

  const { data: product } = await admin
    .from("products")
    .select("slug, name, images")
    .eq("slug", slug)
    .maybeSingle();

  if (!product) return 0;

  let sent = 0;
  for (const r of rows) {
    try {
      await notifyBackInStock({
        email: r.email,
        product: { slug: product.slug, name: product.name, image: product.images?.[0] },
        colour: r.colour,
        size: r.size,
      });
      await admin
        .from("back_in_stock_notifications")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", r.id);
      sent++;
    } catch (err) {
      console.error("[back-in-stock] notify failed", err);
    }
  }
  return sent;
}
