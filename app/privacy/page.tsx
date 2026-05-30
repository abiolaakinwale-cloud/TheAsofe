import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Prose from "@/components/Prose";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy"
        intro="What information Asofe collects, what we do with it, and the rights you hold in relation to your personal data."
        ground="var(--color-cream)"
      />
      <Prose
        lastUpdated="May 2026"
        sections={[
          {
            heading: "1. Who is responsible",
            body: <p>
              Asofe Limited is the data controller for personal information you share with us. Our registered office
              address is available on request from our privacy team at{" "}
              <a href="mailto:privacy@theasofe.com" className="lux-link" style={{ color: "var(--color-oxblood)" }}>privacy@theasofe.com</a>.
            </p>,
          },
          {
            heading: "2. What we collect",
            body: <>
              <p>We collect the following categories of personal information, all of which you provide directly or generate by using the site:</p>
              <ul className="space-y-2 ml-5 list-disc">
                <li>Account details — name, email, password (hashed), shipping addresses, telephone</li>
                <li>Order history — items purchased, prices paid, fulfilment status</li>
                <li>Communications — correspondence with our concierge, returns and after-sales</li>
                <li>Technical data — device, browser, IP address, session identifiers</li>
              </ul>
            </>,
          },
          {
            heading: "3. Why we use it",
            body: <ul className="space-y-2 ml-5 list-disc">
              <li>To fulfil orders, including sharing your delivery details with the originating designer and our shipping partners</li>
              <li>To provide the concierge service and respond to your correspondence</li>
              <li>To prevent fraud, complete authentication checks, and comply with our legal obligations</li>
              <li>Where you have opted in, to send The Correspondence — our quarterly newsletter</li>
            </ul>,
          },
          {
            heading: "4. Sharing",
            body: <p>
              We share data only with the originating designer (to fulfil your order), our payment processor, our shipping
              and customs partners, and our regulated authentication partner. We do not sell personal data, and we do not
              share it with advertising networks.
            </p>,
          },
          {
            heading: "5. International transfers",
            body: <p>
              Order data is necessarily transferred to the country of the originating designer. Where that country is outside
              the United Kingdom or European Economic Area, we rely on standard contractual clauses or an equivalent legal
              mechanism. The list of countries from which our designers operate is set out on the
              <a href="/brands" className="lux-link" style={{ color: "var(--color-oxblood)" }}> Designers page</a>.
            </p>,
          },
          {
            heading: "6. Your rights",
            body: <p>
              You have the right to access, correct, erase, or port your personal data, and to object to or restrict its
              processing. To exercise any of these rights, write to us at the address above. We will respond within thirty days.
            </p>,
          },
          {
            heading: "7. Retention",
            body: <p>
              We retain order data for seven years to meet our tax and accounting obligations, and account data for as long
              as your account remains open. You may close your account at any time by writing to us.
            </p>,
          },
          {
            heading: "8. Cookies",
            body: <p>
              See our <a href="/cookies" className="lux-link" style={{ color: "var(--color-oxblood)" }}>Cookie Preferences</a> page.
            </p>,
          },
        ]}
      />
    </>
  );
}
