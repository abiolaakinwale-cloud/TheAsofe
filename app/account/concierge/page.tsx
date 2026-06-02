import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import ConciergeThread, { type ConciergeMessage } from "@/components/ConciergeThread";
import { sendCustomerMessage } from "./actions";

export const metadata = { title: "Concierge" };

export default async function CustomerConciergePage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account/concierge");

  const admin = getAdminSupabase();
  const { data: thread } = await admin
    .from("concierge_threads")
    .select("id, status, created_at, last_message_at")
    .eq("customer_id", user.id)
    .maybeSingle();

  const initialMessages: ConciergeMessage[] = thread
    ? (await admin
        .from("concierge_messages")
        .select("id, thread_id, sender_role, body, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true })).data as ConciergeMessage[] ?? []
    : [];

  return (
    <>
      <Link href="/account" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Overview
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Concierge</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        Talk to us.
      </h1>
      <p className="text-base leading-relaxed mb-12 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
        Sizing, gift advice, hold a piece for a wedding, a request from a particular designer — write directly. A real person on the team will reply (typically within one working day) and you&apos;ll see their answer here in real time.
      </p>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-12 max-w-5xl">
        <div className="p-6 lg:p-8" style={{ backgroundColor: "var(--color-ground)", boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
          {thread && (
            <p className="text-[10px] tracking-[0.22em] uppercase mb-4 flex items-baseline justify-between" style={{ color: "var(--color-muted)" }}>
              <span>Thread · {thread.status}</span>
              {thread.last_message_at && (
                <span className="tabular-nums">
                  last activity {new Date(thread.last_message_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          )}

          {thread ? (
            <ConciergeThread threadId={thread.id} initialMessages={initialMessages} viewerRole="customer" />
          ) : (
            <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
              No conversation yet. Send your first message below to open a thread.
            </p>
          )}

          <form action={sendCustomerMessage} className="mt-6 pt-6 border-t flex flex-col gap-3" style={{ borderColor: "var(--color-rule)" }}>
            <textarea
              name="body"
              required
              minLength={1}
              maxLength={4000}
              rows={3}
              placeholder="Write your message…"
              className="w-full border bg-transparent p-3 text-base leading-relaxed"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
            <button
              type="submit"
              className="self-start px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
            >
              Send →
            </button>
          </form>
        </div>

        <aside className="text-sm leading-relaxed space-y-4" style={{ color: "var(--color-ink-soft)" }}>
          <p className="eyebrow mb-1" style={{ color: "var(--color-emerald)" }}>How it works</p>
          <ul className="space-y-3 text-xs">
            <li>· The thread stays open across sessions — pick up where you left off any time.</li>
            <li>· You&apos;ll see new replies live (no need to refresh).</li>
            <li>· Email also works: <a className="lux-link" href="mailto:correspondence@theasofe.com" style={{ color: "var(--color-ink)" }}>correspondence@theasofe.com</a>.</li>
            <li>· For specific orders, write the order number — we&apos;ll pull it up on our side.</li>
          </ul>
        </aside>
      </div>
    </>
  );
}
