"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { notifyConciergeThreadOpened } from "@/lib/notifications";

/**
 * Customer-side send. Lazy-creates the thread on first message. Server
 * action so we can update last_message_at + send the admin alert in the
 * same round-trip.
 */
export async function sendCustomerMessage(formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  if (body.length > 4000) throw new Error("Message too long (4000 chars max).");

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account/concierge");

  const admin = getAdminSupabase();
  const { data: existing } = await admin
    .from("concierge_threads")
    .select("id")
    .eq("customer_id", user.id)
    .maybeSingle();

  const isFirstMessage = !existing;
  let threadId = existing?.id;

  if (!threadId) {
    const { data: created, error } = await admin
      .from("concierge_threads")
      .insert({ customer_id: user.id })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not start a thread.");
    threadId = created.id;
  }

  const now = new Date().toISOString();
  await admin.from("concierge_messages").insert({
    thread_id: threadId,
    sender_role: "customer",
    sender_id: user.id,
    body,
  });
  await admin.from("concierge_threads")
    .update({ status: "open", last_message_at: now, updated_at: now })
    .eq("id", threadId);

  if (isFirstMessage) {
    await notifyConciergeThreadOpened({
      customerEmail: user.email ?? "Anonymous",
      firstMessage: body,
      threadId,
    });
  }

  revalidatePath("/account/concierge");
  revalidatePath("/admin/concierge");
}
