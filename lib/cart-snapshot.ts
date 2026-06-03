import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminSupabase } from "./supabase/admin";
import { getServerSupabase } from "./supabase/server";
import { readBag, type BagItem } from "./bag";

// Identity model: signed-in user → "user:<uuid>", guest → "email:<addr>".
// Only one snapshot per identity; rewrites on every bag mutation.

const GUEST_EMAIL_COOKIE = "bag_email";
const COOKIE_MAX_AGE_DAYS = 30;

export type SnapshotIdentity =
  | { kind: "user"; id: string; email: string }
  | { kind: "email"; email: string };

async function resolveIdentity(): Promise<SnapshotIdentity | null> {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (user?.id && user.email) {
    return { kind: "user", id: user.id, email: user.email };
  }
  const store = await cookies();
  const guest = store.get(GUEST_EMAIL_COOKIE)?.value;
  if (guest) return { kind: "email", email: guest };
  return null;
}

function identityKey(id: SnapshotIdentity): string {
  return id.kind === "user" ? `user:${id.id}` : `email:${id.email.toLowerCase()}`;
}

// `subtotal` is in whole pounds (matches the rest of the app's price model).
type SaveArgs = { items: BagItem[]; subtotal: number; identity?: SnapshotIdentity };

/**
 * Upsert the bag snapshot for the current identity. Called from every bag
 * mutation (add, update, remove). Idempotent — overwrites the row each time
 * and resets the abandonment stage so the cron starts the cadence over.
 */
export async function saveBagSnapshot(args: SaveArgs): Promise<void> {
  const identity = args.identity ?? (await resolveIdentity());
  if (!identity) return; // no identity = nothing to recover later

  const sb = getAdminSupabase();
  const key = identityKey(identity);
  const token = randomBytes(16).toString("hex");

  // Upsert by primary key. Preserve an existing recovery_token so an in-flight
  // recovery email's link stays valid across further bag activity.
  const { data: existing } = await sb
    .from("bag_snapshots")
    .select("recovery_token")
    .eq("identity", key)
    .maybeSingle();

  await sb.from("bag_snapshots").upsert({
    identity:       key,
    user_id:        identity.kind === "user" ? identity.id : null,
    email:          identity.email,
    items:          args.items,
    subtotal:       args.subtotal,
    currency:       "GBP",
    recovery_token: existing?.recovery_token ?? token,
    updated_at:     new Date().toISOString(),
  }, { onConflict: "identity" });

  // Reset abandonment cadence so a fresh bag activity restarts the cron clock.
  await sb.from("cart_abandonment_state").upsert({
    identity:     key,
    stage:        0,
    last_sent_at: null,
  }, { onConflict: "identity" });
}

/** Delete the snapshot — called on successful checkout. */
export async function clearBagSnapshot(identity?: SnapshotIdentity): Promise<void> {
  const id = identity ?? (await resolveIdentity());
  if (!id) return;
  const sb = getAdminSupabase();
  const key = identityKey(id);
  await sb.from("bag_snapshots").delete().eq("identity", key);
  // cart_abandonment_state cascades via FK
}

/** Capture a guest email at the /bag page. Server-only cookie, 30 days. */
export async function captureGuestEmail(email: string): Promise<void> {
  const lower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
    throw new Error("Enter a valid email address.");
  }
  const store = await cookies();
  store.set(GUEST_EMAIL_COOKIE, lower, {
    path: "/",
    maxAge: 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS,
    sameSite: "lax",
    httpOnly: false,
  });
  // Mirror to a snapshot immediately so abandonment kicks in even if the
  // visitor closes the tab before mutating the bag again.
  const items = await readBag();
  if (items.length > 0) {
    const { getEnrichedBag } = await import("./bag");
    const bag = await getEnrichedBag();
    await saveBagSnapshot({
      items,
      subtotal: bag.subtotal,
      identity: { kind: "email", email: lower },
    });
  }
}

/** Read snapshot by recovery token — used by /bag?recover=… restore flow. */
export async function getSnapshotByToken(token: string): Promise<{
  identity: string; email: string; items: BagItem[]; subtotal: number;
} | null> {
  if (!token || !/^[a-f0-9]{32}$/.test(token)) return null;
  const sb = getAdminSupabase();
  const { data } = await sb
    .from("bag_snapshots")
    .select("identity, email, items, subtotal")
    .eq("recovery_token", token)
    .maybeSingle();
  if (!data) return null;
  return data as { identity: string; email: string; items: BagItem[]; subtotal: number };
}
