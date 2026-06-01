import type { Metadata } from "next";
import { STANDARD_DENOMINATIONS_PENCE, formatGbpPence } from "@/lib/gift-cards";
import { purchaseGiftCard } from "./actions";

export const metadata: Metadata = {
  title: "Gift cards",
  description: "Send the gift of any designer on Asofe. Delivered by email with a personal note.",
};

export default async function GiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const { error, cancelled } = await searchParams;

  return (
    <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[88rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-12 lg:gap-20">
        {/* ─── Editorial hero ────────────────────────────────────── */}
        <div className="lg:col-span-5 order-2 lg:order-1">
          <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>The Asofe Card</p>
          <h1 className="display text-4xl lg:text-6xl mb-6 max-w-[16ch]" style={{ color: "var(--color-ink)" }}>
            A piece they choose themselves.
          </h1>
          <p className="text-base lg:text-lg leading-relaxed mb-8 max-w-md" style={{ color: "var(--color-ink-soft)" }}>
            Buy a gift card and let them pick from any designer on the floor.
            Delivered by email with your personal note, redeemable at checkout against any piece.
          </p>
          <ul className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            <li>· Apply at checkout — covers any item on Asofe</li>
            <li>· No expiry until 12 months after issue</li>
            <li>· Sent immediately, or schedule a date</li>
            <li>· Partial redemptions stay on the card</li>
          </ul>
        </div>

        {/* ─── Purchase form ─────────────────────────────────────── */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="p-8 lg:p-10" style={{ backgroundColor: "var(--color-cream)" }}>
            {error && (
              <p className="mb-6 p-4 text-sm" style={{ color: "var(--color-oxblood)", backgroundColor: "var(--color-ground)" }}>
                {decodeURIComponent(error)}
              </p>
            )}
            {cancelled === "1" && (
              <p className="mb-6 p-4 text-sm" style={{ color: "var(--color-ink-soft)", backgroundColor: "var(--color-ground)" }}>
                Payment cancelled — no card was issued.
              </p>
            )}

            <form action={purchaseGiftCard} className="space-y-8">
              <fieldset>
                <legend className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Amount</legend>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                  {STANDARD_DENOMINATIONS_PENCE.map((p, i) => (
                    <label key={p} className="cursor-pointer">
                      <input type="radio" name="amount" value={p} required defaultChecked={i === 1} className="peer sr-only" />
                      <span className="block py-4 text-center text-base tabular-nums border peer-checked:bg-[var(--color-ink)] peer-checked:text-[var(--color-ground)] transition-colors"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
                        {formatGbpPence(p)}
                      </span>
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-muted)" }}>
                    Or a custom amount (£25 – £5,000)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-base" style={{ color: "var(--color-muted)" }}>£</span>
                    <input
                      name="custom_amount"
                      type="number"
                      min="25"
                      max="5000"
                      step="1"
                      placeholder="—"
                      className="w-32 h-11 border bg-transparent px-3 text-base tabular-nums"
                      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                    />
                    <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                      overrides the picker above
                    </span>
                  </div>
                </label>
              </fieldset>

              <fieldset>
                <legend className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>For</legend>
                <div className="grid sm:grid-cols-2 gap-5">
                  <label className="block">
                    <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Recipient name</span>
                    <input
                      name="recipient_name"
                      type="text"
                      placeholder="Optional"
                      className="w-full h-11 border bg-transparent px-3 text-base"
                      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                    />
                  </label>
                  <label className="block">
                    <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Recipient email *</span>
                    <input
                      name="recipient_email"
                      type="email"
                      required
                      placeholder="their.email@example.com"
                      className="w-full h-11 border bg-transparent px-3 text-base"
                      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                    />
                  </label>
                  <label className="block">
                    <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>From (your name)</span>
                    <input
                      name="from_name"
                      type="text"
                      placeholder="Optional — shown to the recipient"
                      className="w-full h-11 border bg-transparent px-3 text-base"
                      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                    />
                  </label>
                  <label className="block">
                    <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Deliver on</span>
                    <input
                      name="send_date"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full h-11 border bg-transparent px-3 text-base"
                      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                    />
                    <span className="block mt-1 text-xs" style={{ color: "var(--color-muted)" }}>Leave blank to send immediately</span>
                  </label>
                </div>
              </fieldset>

              <label className="block">
                <span className="block mb-2 eyebrow" style={{ color: "var(--color-emerald)" }}>Personal note</span>
                <textarea
                  name="message"
                  rows={4}
                  maxLength={500}
                  placeholder="A line or two — appears in the email alongside the code."
                  className="w-full border bg-transparent p-3 text-base leading-relaxed"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                />
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
                >
                  Continue to payment →
                </button>
                <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  Payment is processed by Stripe in GBP. The card is issued and emailed once payment confirms.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
