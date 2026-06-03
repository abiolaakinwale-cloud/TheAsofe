"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { writeBag, type BagItem } from "@/lib/bag";
import { getSnapshotByToken } from "@/lib/cart-snapshot";

/**
 * Restore a bag from an abandoned-cart email link. Writes the bag cookie,
 * stores the visitor's email so abandonment cadence picks them up again,
 * and redirects to /bag for the final review step.
 */
export async function restoreBagFromToken(token: string): Promise<void> {
  const snap = await getSnapshotByToken(token);
  if (!snap) redirect("/bag?recover=invalid");

  const items: BagItem[] = snap.items.map(i => ({
    slug: i.slug, size: i.size, colour: i.colour, qty: Math.max(1, Number(i.qty) || 1),
  }));
  await writeBag(items);

  const store = await cookies();
  if (snap.email && !store.get("bag_email")) {
    store.set("bag_email", snap.email, { path: "/", maxAge: 60*60*24*30, sameSite: "lax" });
  }
  redirect("/bag?recovered=1");
}
