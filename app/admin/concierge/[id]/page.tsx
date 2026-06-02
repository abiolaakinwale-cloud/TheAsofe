import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import ConciergeThread, { type ConciergeMessage } from "@/components/ConciergeThread";
import { sendAdminMessage, setThreadStatus } from "../actions";

export default async function AdminThreadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();

  const { data: thread } = await sb
    .from("concierge_threads")
    .select("id, customer_id, status, created_at, last_message_at, profiles:customer_id(email)")
    .eq("id", id)
    .maybeSingle();
  if (!thread) notFound();

  const { data: msgs } = await sb
    .from("concierge_messages")
    .select("id, thread_id, sender_role, body, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });
  const initialMessages = (msgs ?? []) as ConciergeMessage[];

  const customer = Array.isArray(thread.profiles) ? thread.profiles[0] : thread.profiles;

  return (
    <>
      <Link href="/admin/concierge" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Concierge
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
        <h1 className="display text-3xl lg:text-4xl" style={{ color: "var(--color-ink)" }}>
          {customer?.email ?? "Unknown customer"}
        </h1>
        <span className="text-[11px] tracking-[0.22em] uppercase px-3 py-1" style={{
          backgroundColor: thread.status === "open" ? "var(--color-saffron)" : "var(--color-rule)",
          color: thread.status === "open" ? "var(--color-ink)" : "var(--color-muted)",
        }}>
          {thread.status}
        </span>
      </div>
      <p className="serif italic mb-10" style={{ color: "var(--color-ink-soft)" }}>
        Thread opened {new Date(thread.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-12 max-w-6xl">
        <div className="p-6 lg:p-8" style={{ backgroundColor: "var(--color-ground)", boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
          <ConciergeThread threadId={thread.id} initialMessages={initialMessages} viewerRole="admin" />

          <form action={sendAdminMessage.bind(null, thread.id)} className="mt-6 pt-6 border-t flex flex-col gap-3" style={{ borderColor: "var(--color-rule)" }}>
            <textarea
              name="body"
              required
              minLength={1}
              maxLength={4000}
              rows={3}
              placeholder="Reply as Asofe…"
              className="w-full border bg-transparent p-3 text-base leading-relaxed"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
            <button
              type="submit"
              className="self-start px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
              style={{ backgroundColor: "var(--color-emerald)", color: "var(--color-ground)" }}
            >
              Send reply →
            </button>
          </form>
        </div>

        <aside>
          <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Actions</h2>
          {thread.status === "open" ? (
            <form action={setThreadStatus.bind(null, thread.id, "closed")}>
              <button type="submit" className="px-5 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-muted)", color: "var(--color-muted)" }}>
                Close thread
              </button>
            </form>
          ) : (
            <form action={setThreadStatus.bind(null, thread.id, "open")}>
              <button type="submit" className="px-5 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-saffron)", color: "var(--color-saffron)" }}>
                Reopen thread
              </button>
            </form>
          )}

          <div className="mt-8">
            <Link href={`/admin/users/${thread.customer_id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-cobalt)" }}>
              View customer profile →
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
