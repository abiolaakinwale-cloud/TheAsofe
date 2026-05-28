"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BAG_LIMITS, readBag, writeBag, type BagItem } from "@/lib/bag";
import { getAnonSupabase } from "@/lib/supabase/anon";

async function stockFor(slug: string, size: string): Promise<number> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("stock_levels")
    .select("quantity")
    .eq("product_slug", slug)
    .eq("size", size)
    .maybeSingle();
  return data?.quantity ?? 0;
}

export async function addToBag(slug: string, size: string) {
  if (!slug || !size) throw new Error("Missing slug or size.");
  const stock = await stockFor(slug, size);
  if (stock <= 0) throw new Error("This piece is out of stock in your chosen size.");

  const items = await readBag();
  const i = items.findIndex(x => x.slug === slug && x.size === size);
  const cap = Math.min(stock, BAG_LIMITS.perLine);
  if (i >= 0) {
    items[i] = { ...items[i], qty: Math.min(items[i].qty + 1, cap) };
  } else {
    items.push({ slug, size, qty: 1 });
  }
  await writeBag(items);
  revalidatePath("/", "layout");
  redirect("/bag");
}

export async function updateBagQty(slug: string, size: string, qty: number) {
  const items = await readBag();
  const next: BagItem[] = [];
  for (const it of items) {
    if (it.slug === slug && it.size === size) {
      if (qty <= 0) continue;
      const stock = await stockFor(slug, size);
      next.push({ ...it, qty: Math.min(qty, Math.min(stock, BAG_LIMITS.perLine)) });
    } else {
      next.push(it);
    }
  }
  await writeBag(next);
  revalidatePath("/", "layout");
}

export async function removeFromBag(slug: string, size: string) {
  const items = await readBag();
  await writeBag(items.filter(i => !(i.slug === slug && i.size === size)));
  revalidatePath("/", "layout");
}

export async function clearBag() {
  await writeBag([]);
  revalidatePath("/", "layout");
}
