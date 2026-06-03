"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BAG_LIMITS, getEnrichedBag, readBag, writeBag, type BagItem } from "@/lib/bag";
import { getAnonSupabase } from "@/lib/supabase/anon";
import { getServerSupabase } from "@/lib/supabase/server";
import { saveBagSnapshot } from "@/lib/cart-snapshot";

// Mirror the current cookie bag to the durable snapshot so the abandonment
// cron can reach guests + signed-in users alike. Best-effort — never throws.
async function syncSnapshot(): Promise<void> {
  try {
    const bag = await getEnrichedBag();
    if (bag.items.length === 0) return;
    await saveBagSnapshot({
      items: bag.items.map(i => ({ slug: i.slug, size: i.size, colour: i.colour, qty: i.qty })),
      subtotal: bag.subtotal,
    });
  } catch (err) {
    console.error("[bag] snapshot sync failed", err);
  }
}

// Look up stock for a specific (slug, colour, size). Falls back to '' for
// products created before variants (their row has colour='' in stock_levels).
async function stockFor(slug: string, colour: string, size: string): Promise<number> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("stock_levels")
    .select("quantity")
    .eq("product_slug", slug)
    .eq("colour", colour)
    .eq("size", size)
    .maybeSingle();
  return data?.quantity ?? 0;
}

// Look up whether the product is backorderable (made_to_order) so we can let
// the customer add a sold-out (colour, size) when the designer allows it.
async function backorderableFor(slug: string): Promise<boolean> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("products")
    .select("made_to_order, lead_time_weeks")
    .eq("slug", slug)
    .maybeSingle();
  return !!data?.made_to_order && !!data?.lead_time_weeks && data.lead_time_weeks > 0;
}

function sameLine(a: BagItem, slug: string, colour: string, size: string) {
  return a.slug === slug && (a.colour ?? "") === colour && a.size === size;
}

export async function addToBag(slug: string, size: string, colour: string = "") {
  if (!slug || !size) throw new Error("Missing slug or size.");
  const stock = await stockFor(slug, colour, size);
  const backorderable = stock === 0 ? await backorderableFor(slug) : false;
  if (stock <= 0 && !backorderable) {
    throw new Error("This piece is out of stock in your chosen size.");
  }

  const items = await readBag();
  const i = items.findIndex(x => sameLine(x, slug, colour, size));
  const cap = backorderable ? BAG_LIMITS.perLine : Math.min(stock, BAG_LIMITS.perLine);
  if (i >= 0) {
    items[i] = { ...items[i], qty: Math.min(items[i].qty + 1, cap) };
  } else {
    items.push({ slug, colour: colour || undefined, size, qty: 1 });
  }
  await writeBag(items);
  await syncSnapshot();
  revalidatePath("/", "layout");
  redirect("/bag");
}

export async function updateBagQty(slug: string, colour: string, size: string, qty: number) {
  const items = await readBag();
  const next: BagItem[] = [];
  for (const it of items) {
    if (sameLine(it, slug, colour, size)) {
      if (qty <= 0) continue;
      const stock = await stockFor(slug, colour, size);
      const backorderable = stock === 0 ? await backorderableFor(slug) : false;
      const cap = backorderable ? BAG_LIMITS.perLine : Math.min(stock, BAG_LIMITS.perLine);
      next.push({ ...it, qty: Math.min(qty, cap) });
    } else {
      next.push(it);
    }
  }
  await writeBag(next);
  await syncSnapshot();
  revalidatePath("/", "layout");
}

export async function removeFromBag(slug: string, colour: string, size: string) {
  const items = await readBag();
  await writeBag(items.filter(i => !sameLine(i, slug, colour, size)));
  await syncSnapshot();
  revalidatePath("/", "layout");
}

export async function clearBag() {
  await writeBag([]);
  // Snapshot is cleared by the checkout / webhook path, not here — manual
  // clears should not silently drop the abandonment row.
  revalidatePath("/", "layout");
}

/**
 * Move a bag line to the customer's wishlist. Requires sign-in (wishlist is
 * per-user). If unauthenticated, redirects to sign-in with a `next` back to
 * the bag. If already wishlisted, the insert is a no-op (PK conflict).
 */
export async function saveForLater(slug: string, colour: string, size: string) {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/bag");

  // Add to wishlist (ignore conflict — already saved is fine)
  await sb.from("wishlist").upsert(
    { user_id: user.id, product_slug: slug },
    { onConflict: "user_id,product_slug", ignoreDuplicates: true }
  );

  // Remove the line from the bag cookie
  const items = await readBag();
  await writeBag(items.filter(i => !sameLine(i, slug, colour, size)));

  revalidatePath("/", "layout");
  revalidatePath("/account/wishlist");
  redirect(`/bag?saved=${encodeURIComponent(slug)}`);
}
