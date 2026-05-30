import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Prose from "@/components/Prose";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms & Conditions"
        intro="The basis on which Asofe sells goods to you, and the responsibilities of every designer represented on our marketplace."
        ground="var(--color-cream)"
      />
      <Prose
        lastUpdated="May 2026"
        sections={[
          {
            heading: "1. About Asofe",
            body: <>
              <p>
                Asofe Limited (&ldquo;Asofe&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a curated marketplace of independent African luxury houses
                (&ldquo;designers&rdquo;). Items sold through the platform are fulfilled by the originating designer and shipped to you directly,
                or, where stated, dispatched from our Lagos atelier.
              </p>
              <p>
                Our registered office address is available on request from our customer-care team. By placing an
                order through theasofe.com you agree to the terms set out below.
              </p>
            </>,
          },
          {
            heading: "2. Orders",
            body: <>
              <p>
                An order placed through Asofe is an offer to purchase. We accept the offer only upon dispatch confirmation. We
                reserve the right to decline any order, in particular where stock has been mis-listed, where a price error has
                occurred, or where authentication checks cannot be completed to our satisfaction.
              </p>
              <p>
                Made-to-measure and pre-order pieces are produced after order. The lead time is stated on each product page and
                runs from the date of order to the date of dispatch.
              </p>
            </>,
          },
          {
            heading: "3. Pricing and currency",
            body: <p>
              Prices are listed in pounds sterling (GBP) and exclude duties and taxes applicable to your delivery address. Where
              your delivery is to the European Union, the United Kingdom, or selected African Union countries with which Asofe
              has a clearance arrangement, duties are calculated and shown at checkout (DDP).
            </p>,
          },
          {
            heading: "4. Shipping",
            body: <p>
              Shipping is offered worldwide save where prohibited by export controls. Timelines and charges are set out on the
              <a href="/shipping" className="lux-link" style={{ color: "var(--color-oxblood)" }}> Shipping page</a>.
              Title and risk of loss pass to you on delivery.
            </p>,
          },
          {
            heading: "5. Returns",
            body: <p>
              You may return any in-stock piece within 28 days of receipt under the conditions set out on our
              <a href="/returns" className="lux-link" style={{ color: "var(--color-oxblood)" }}> Returns page</a>. Made-to-measure
              and personalised pieces are not eligible for return except where defective.
            </p>,
          },
          {
            heading: "6. Authenticity",
            body: <p>
              Every piece sold through Asofe is sourced directly from its designer of origin. Where applicable, items are dispatched
              with a certificate of authenticity. We do not knowingly list third-party or grey-market goods.
            </p>,
          },
          {
            heading: "7. Liability",
            body: <p>
              To the extent permitted by applicable law, Asofe&apos;s liability in respect of any order is limited to the price
              paid. Nothing in these terms excludes liability that cannot lawfully be excluded.
            </p>,
          },
          {
            heading: "8. Governing law",
            body: <p>
              These terms are governed by the laws of England and Wales. Disputes are subject to the non-exclusive jurisdiction
              of the English courts, without prejudice to your statutory rights as a consumer in your home jurisdiction.
            </p>,
          },
          {
            heading: "9. Contact",
            body: <p>
              Questions about these terms? Write to{" "}
              <a href="mailto:correspondence@theasofe.com" className="lux-link" style={{ color: "var(--color-oxblood)" }}>
                correspondence@theasofe.com
              </a>.
            </p>,
          },
        ]}
      />
    </>
  );
}
