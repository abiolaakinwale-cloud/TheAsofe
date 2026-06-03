"use server";

import { subscribeBackInStock, BackInStockError } from "@/lib/back-in-stock";
import { getServerSupabase } from "@/lib/supabase/server";
import { track } from "@/lib/analytics";

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string };

export async function subscribeBackInStockAction(
  productSlug: string,
  colour: string,
  size: string,
  emailFromForm: string,
): Promise<SubscribeResult> {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const email = user?.email ?? emailFromForm;

  try {
    const result = await subscribeBackInStock({ productSlug, colour, size, email });

    await track("back_in_stock_subscribed", {
      userId: user?.id ?? null,
      email,
    }, {
      slug: productSlug, colour, size, already_subscribed: result.alreadySubscribed,
    });

    return { ok: true, alreadySubscribed: result.alreadySubscribed };
  } catch (err) {
    if (err instanceof BackInStockError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Couldn't save your subscription. Try again shortly." };
  }
}
