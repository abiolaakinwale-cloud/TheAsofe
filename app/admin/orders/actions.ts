"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  notifyOrderDelivered,
  notifyOrderDispatched,
  notifyOrderPacked,
} from "@/lib/notifications";

async function requireAdmin() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Admin role required.");
}

export async function setOrderStatus(id: string, status: "paid" | "packed" | "dispatched" | "delivered" | "cancelled") {
  await requireAdmin();
  const sb = getAdminSupabase();
  const { data: order, error } = await sb
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, customer_email")
    .single();
  if (error) throw new Error(error.message);

  if (order?.customer_email) {
    if (status === "packed")     await notifyOrderPacked({ id: order.id, customer_email: order.customer_email });
    if (status === "dispatched") await notifyOrderDispatched({ id: order.id, customer_email: order.customer_email });
    if (status === "delivered")  await notifyOrderDelivered({ id: order.id, customer_email: order.customer_email });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}
