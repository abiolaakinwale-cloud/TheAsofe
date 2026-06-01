import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatGbpPence } from "@/lib/gift-cards";
import { cancelGiftCard, resendGiftCardEmail } from "../actions";
import AuditPanel from "@/components/admin/AuditPanel";

function formatTs(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default async function AdminGiftCardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();

  const { data: card } = await sb
    .from("gift_cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!card) notFound();

  const { data: redemptions } = await sb
    .from("gift_card_redemptions")
    .select("id, amount_pence, created_at, order_id")
    .eq("gift_card_id", id)
    .order("created_at", { ascending: false });

  const usedPence = card.initial_value_pence - card.balance_pence;
  const usedPct = card.initial_value_pence > 0 ? Math.round((usedPence / card.initial_value_pence) * 100) : 0;

  return (
    <>
      <Link href="/admin/gift-cards" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Gift cards
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
        <h1 className="display text-3xl lg:text-4xl font-mono tracking-wide" style={{ color: "var(--color-ink)" }}>
          {card.code}
        </h1>
        <span className="text-[11px] tracking-[0.22em] uppercase px-3 py-1" style={{
          backgroundColor:
            card.status === "active"          ? "var(--color-emerald)" :
            card.status === "fully_redeemed"  ? "var(--color-muted)"   :
            "var(--color-oxblood)",
          color: card.status === "fully_redeemed" ? "var(--color-ground)" : "var(--color-ground)",
        }}>
          {String(card.status).replace(/_/g, " ")}
        </span>
      </div>
      <p className="serif italic mb-12" style={{ color: "var(--color-ink-soft)" }}>
        Issued {formatTs(card.created_at)}{card.expires_at ? ` · expires ${card.expires_at}` : ""}
      </p>

      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-12 max-w-6xl">
        <div>
          {/* Balance card */}
          <div className="p-8 mb-10" style={{ backgroundColor: "var(--color-cream)" }}>
            <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Balance</p>
            <div className="flex items-baseline gap-4 mb-3">
              <p className="display text-5xl tabular-nums" style={{ color: "var(--color-ink)" }}>
                {formatGbpPence(card.balance_pence)}
              </p>
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                of {formatGbpPence(card.initial_value_pence)} ({usedPct}% used)
              </p>
            </div>
            <div className="w-full h-1.5" style={{ backgroundColor: "var(--color-rule)" }}>
              <div className="h-full" style={{ width: `${usedPct}%`, backgroundColor: "var(--color-saffron)" }} />
            </div>
          </div>

          {/* Redemption ledger */}
          <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>
            Redemptions ({redemptions?.length ?? 0})
          </h2>
          {!redemptions || redemptions.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>No redemptions yet.</p>
          ) : (
            <ul className="space-y-3 mb-10">
              {redemptions.map(r => (
                <li key={r.id} className="flex items-baseline justify-between gap-4 border-b pb-3" style={{ borderColor: "var(--color-rule)" }}>
                  <div>
                    <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                      {formatGbpPence(r.amount_pence)} applied to{" "}
                      <Link href={`/admin/orders/${r.order_id}`} className="lux-link font-mono">
                        order {r.order_id.slice(0, 8)}
                      </Link>
                    </p>
                  </div>
                  <p className="text-xs tabular-nums whitespace-nowrap" style={{ color: "var(--color-muted)" }}>
                    {formatTs(r.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {/* Personal message — if any */}
          {card.personal_message && (
            <div className="p-5 mb-10" style={{ backgroundColor: "var(--color-cream)" }}>
              <p className="eyebrow mb-3" style={{ color: "var(--color-muted)" }}>Personal note (from purchaser)</p>
              <p className="serif italic text-base leading-relaxed" style={{ color: "var(--color-ink)" }}>
                &ldquo;{card.personal_message}&rdquo;
              </p>
            </div>
          )}

          {/* Actions */}
          <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Actions</h2>
          <div className="flex flex-wrap gap-3 mb-6">
            <form action={resendGiftCardEmail.bind(null, id)}>
              <button
                type="submit"
                className="px-5 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
                style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
              >
                Resend email to recipient
              </button>
            </form>
          </div>

          {card.status === "active" && (
            <details className="border-t pt-6 max-w-xl" style={{ borderColor: "var(--color-rule)" }}>
              <summary className="cursor-pointer text-[11px] tracking-[0.22em] uppercase font-medium" style={{ color: "var(--color-oxblood)" }}>
                Cancel this card
              </summary>
              <form action={cancelGiftCard} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={id} />
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Cancelling forfeits the {formatGbpPence(card.balance_pence)} balance immediately. The recipient won&apos;t be notified — coordinate that out of band.
                </p>
                <textarea
                  name="reason"
                  rows={2}
                  placeholder="Reason for cancellation (internal note)"
                  className="w-full border bg-transparent p-3 text-sm"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                />
                <button
                  type="submit"
                  className="px-5 py-3 text-[11px] tracking-[0.22em] uppercase font-medium border"
                  style={{ borderColor: "var(--color-oxblood)", color: "var(--color-oxblood)" }}
                >
                  Confirm cancellation
                </button>
              </form>
            </details>
          )}
        </div>

        <aside>
          <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Particulars</h2>
          <dl className="space-y-3 text-sm">
            <Row k="Recipient" v={card.recipient_name ? `${card.recipient_name}` : "—"} />
            <Row k="Recipient email" v={card.recipient_email ?? "—"} />
            <Row k="Purchaser email" v={card.purchaser_email ?? "—"} />
            <Row k="Currency" v={card.currency} />
            <Row k="Issued" v={formatTs(card.created_at)} />
            {card.scheduled_send_at && <Row k="Scheduled send" v={card.scheduled_send_at} />}
            {card.delivered_at && <Row k="Email delivered" v={formatTs(card.delivered_at)} />}
            {card.expires_at && <Row k="Expires" v={card.expires_at} />}
            {card.issued_via_order_id && <Row k="From order" v={String(card.issued_via_order_id).slice(0, 8)} link={`/admin/orders/${card.issued_via_order_id}`} />}
          </dl>

          <div className="mt-6">
            <AuditPanel targetType="gift_card" targetId={id} />
          </div>
        </aside>
      </section>
    </>
  );
}

function Row({ k, v, link }: { k: string; v: string; link?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className="text-xs text-right break-all" style={{ color: "var(--color-ink)" }}>
        {link ? <Link href={link} className="lux-link font-mono">{v}</Link> : v}
      </dd>
    </div>
  );
}
