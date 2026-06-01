import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buyer Protection",
  description: "Authentication, payment security, and dispute resolution for every Asofe order.",
};

export default function BuyerProtectionPage() {
  return (
    <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>The promise</p>
        <h1 className="display text-4xl lg:text-6xl mb-8" style={{ color: "var(--color-ink)" }}>
          Buyer Protection.
        </h1>
        <p className="serif italic text-xl mb-12 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
          Three guarantees on every order: it&apos;s authentic, your payment is secure, and if something goes wrong we resolve it ourselves.
        </p>

        <article className="space-y-16 text-base leading-relaxed" style={{ color: "var(--color-ink)" }}>

          <Section title="Authenticity" eyebrow="Promise one">
            <p>
              Every piece on Asofe comes directly from the designer&apos;s atelier. We do not list grey-market stock, resale, or third-party imports. Each order ships with a designer-issued certificate (where applicable) and our internal authentication log.
            </p>
            <p>
              If a piece you receive is not what the designer made or doesn&apos;t match its description on this site, we will refund you in full and, where applicable, recover the piece at our expense.
            </p>
          </Section>

          <Section title="Payment security" eyebrow="Promise two">
            <p>
              Payment is processed by Stripe, a PCI-DSS Level 1 certified payment provider. Asofe never sees or stores your card details. All transactions are routed over TLS 1.3.
            </p>
            <p>
              Kadd Consulting Limited (trading as Asofe) is the merchant of record on your statement — your contract is with us, not the designer. This means a single point of accountability if anything needs resolving.
            </p>
          </Section>

          <Section title="Dispute resolution" eyebrow="Promise three">
            <p>
              If a piece arrives damaged, late, materially different to its description, or doesn&apos;t arrive at all, write to{" "}
              <a className="lux-link" href="mailto:correspondence@theasofe.com">correspondence@theasofe.com</a>{" "}
              and we will respond within one working day. Most disputes are resolved within five working days.
            </p>
            <p>
              We do not require you to negotiate with the designer directly. Our customer-care team owns the resolution end-to-end, including any required refund or replacement.
            </p>
            <p>
              If we cannot resolve a dispute to your satisfaction, you retain every statutory right under UK consumer law, including the right to chargeback through your card issuer for unauthorised or undelivered purchases.
            </p>
          </Section>

          <Section title="What Buyer Protection covers" eyebrow="In scope">
            <ul className="list-disc pl-6 space-y-3 marker:text-[var(--color-muted)]">
              <li>Pieces materially different to the description, photographs, or specifications shown on the product page</li>
              <li>Pieces that arrive damaged, defective, or with manufacturing faults</li>
              <li>Orders that fail to arrive within 30 days of dispatch</li>
              <li>Unauthorised transactions on your payment method</li>
              <li>Authenticity disputes — if you suspect a piece is not designer-direct</li>
            </ul>
          </Section>

          <Section title="What sits with Returns instead" eyebrow="Out of scope">
            <p>
              Change-of-mind, sizing issues, or pieces in their original condition you simply don&apos;t want to keep are handled by our standard{" "}
              <Link href="/returns" className="lux-link" style={{ color: "var(--color-ink)" }}>Returns policy</Link>{" "}
              — 7 days, complimentary, with no questions asked.
            </p>
            <p>
              Buyer Protection is for things that went wrong with the piece or the transaction; Returns is for things that went wrong with the fit.
            </p>
          </Section>

          <Section title="How to raise a claim" eyebrow="Process">
            <ol className="list-decimal pl-6 space-y-3 marker:text-[var(--color-muted)]">
              <li>Email{" "}
                <a className="lux-link" href="mailto:correspondence@theasofe.com">correspondence@theasofe.com</a>{" "}
                quoting your order number (it&apos;s on every confirmation email)</li>
              <li>Include photographs where the issue is visible</li>
              <li>We acknowledge within one working day with next steps</li>
              <li>For physical issues, we arrange collection at our cost</li>
              <li>Resolution — refund, replacement, or repair — within ten working days of receipt</li>
            </ol>
          </Section>

          <Section title="Statutory rights" eyebrow="The legal floor">
            <p>
              Nothing on this page limits your statutory rights under the UK Consumer Rights Act 2015 or, where applicable, the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013. Where our policy gives you more than the law requires, the more generous of the two applies.
            </p>
          </Section>
        </article>

        <div className="mt-20 pt-12 border-t" style={{ borderColor: "var(--color-rule)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
            Need a return for change-of-mind or sizing? See our{" "}
            <Link href="/returns" className="lux-link" style={{ color: "var(--color-ink)" }}>Returns policy</Link>.
            <br />
            Authenticity questions on a specific piece?{" "}
            <Link href="/authentication" className="lux-link" style={{ color: "var(--color-ink)" }}>Authentication process</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>{eyebrow}</p>
      <h2 className="display text-2xl lg:text-3xl mb-6" style={{ color: "var(--color-ink)" }}>{title}</h2>
      <div className="space-y-4" style={{ color: "var(--color-ink-soft)" }}>
        {children}
      </div>
    </section>
  );
}
