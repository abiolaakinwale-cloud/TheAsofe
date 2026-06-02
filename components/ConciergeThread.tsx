"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export type ConciergeMessage = {
  id: string;
  thread_id: string;
  sender_role: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

type Props = {
  threadId: string;
  initialMessages: ConciergeMessage[];
  /** "customer" view bubbles right, "admin" view bubbles right for admin. */
  viewerRole: "customer" | "admin";
};

/**
 * Renders the message list + live-updates via Supabase realtime
 * postgres_changes subscription on concierge_messages filtered to this
 * thread. Pure render — no compose box; that's a sibling server-action
 * form so the optimistic flow stays simple.
 */
export default function ConciergeThread({ threadId, initialMessages, viewerRole }: Props) {
  const [messages, setMessages] = useState<ConciergeMessage[]>(initialMessages);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sb = getBrowserSupabase();
    const channel = sb
      .channel(`concierge:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "concierge_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as ConciergeMessage;
          setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      {messages.length === 0 && (
        <li className="text-center py-8 text-sm" style={{ color: "var(--color-muted)" }}>
          No messages yet — say hello.
        </li>
      )}
      {messages.map(m => {
        const mine = m.sender_role === viewerRole;
        const isSystem = m.sender_role === "system";
        return (
          <li
            key={m.id}
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] px-4 py-3 text-sm leading-relaxed"
              style={{
                backgroundColor: isSystem
                  ? "var(--color-cream)"
                  : mine
                  ? "var(--color-ink)"
                  : "var(--color-cream)",
                color: isSystem
                  ? "var(--color-muted)"
                  : mine
                  ? "var(--color-ground)"
                  : "var(--color-ink)",
              }}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] tracking-[0.18em] uppercase" style={{ color: mine ? "rgba(255,255,255,0.45)" : "var(--color-muted)", opacity: 0.7 }}>
                {m.sender_role === "admin" ? "Asofe" : m.sender_role === "system" ? "System" : "You"} ·{" "}
                {new Date(m.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </li>
        );
      })}
      <div ref={endRef} />
    </ul>
  );
}
