"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { logAction } from "@/lib/audit";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin only.");
  return user;
}

export async function sendAdminMessage(threadId: string, formData: FormData) {
  const user = await requireAdmin();
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  if (body.length > 4000) throw new Error("Message too long (4000 chars max).");

  const admin = getAdminSupabase();
  const now = new Date().toISOString();
  await admin.from("concierge_messages").insert({
    thread_id: threadId,
    sender_role: "admin",
    sender_id: user.id,
    body,
  });
  await admin.from("concierge_threads")
    .update({ status: "open", last_message_at: now, updated_at: now })
    .eq("id", threadId);

  revalidatePath(`/admin/concierge/${threadId}`);
  revalidatePath("/admin/concierge");
}

export async function setThreadStatus(threadId: string, status: "open" | "closed") {
  await requireAdmin();
  const admin = getAdminSupabase();
  await admin.from("concierge_threads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", threadId);
  await logAction({
    action: status === "closed" ? "concierge.thread_closed" : "concierge.thread_reopened",
    targetType: "thread",
    targetId: threadId,
  });
  revalidatePath(`/admin/concierge/${threadId}`);
  revalidatePath("/admin/concierge");
}
