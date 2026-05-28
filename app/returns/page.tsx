import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Prose from "@/components/Prose";

export const metadata: Metadata = { title: "Returns" };

export default function ReturnsPage() {
  return (
    <>
      <PageHero
        eyebrow="Customer Care"
        title="Returns."
        intro="A return should be as quiet as the order itself. The procedure below applies to every in-stock piece bought through theasofe.com."
        ground="var(--color-sage)"
      />

      <Prose
        lastUpdated="May 2026"
        sections={[
          {
            heading: "1. The window",
            body: <p>
              You may return any in-stock piece within twenty-eight days of receipt. The window opens on the day the
              parcel is signed for and closes at midnight on the twenty-eighth day, in your local time.
            </p>,
          },
          {
            heading: "2. The condition",
            body: <>
              <p>To be accepted for refund, returned pieces must be:</p>
              <ul className="space-y-2 ml-5 list-disc">
                <li>Unworn, unwashed, and free of fragrance, make-up, or any visible wear</li>
                <li>Returned with all original tags and the certificate of authenticity</li>
                <li>Packed in the original protective wrapping and outer box, where applicable</li>
                <li>Shoes returned in their dust bag, with original sole protection intact</li>
              </ul>
            </>,
          },
          {
            heading: "3. How to begin",
            body: <p>
              Write to{" "}
              <a href="mailto:returns@theasofe.com" className="lux-link" style={{ color: "var(--color-oxblood)" }}>returns@theasofe.com</a>{" "}
              with your order number. We will issue a pre-paid shipping label and a return authorisation note. We do not
              accept returns sent without an authorisation note as we cannot match them to your order.
            </p>,
          },
          {
            heading: "4. Refund & timing",
            body: <p>
              Refunds are issued to the original method of payment once the piece has been received and inspected by the
              originating designer, typically within ten working days of the return arriving with us. Shipping is refunded
              only where the return is the result of our error.
            </p>,
          },
          {
            heading: "5. What we cannot return",
            body: <ul className="space-y-2 ml-5 list-disc">
              <li>Made-to-measure, custom-coloured, or personalised pieces, except where defective</li>
              <li>Earrings and fine jewellery worn against the skin, for hygiene reasons</li>
              <li>Edited final-sale pieces, marked clearly at the time of purchase</li>
            </ul>,
          },
          {
            heading: "6. Exchanges",
            body: <p>
              We do not operate a formal exchange programme. Where you wish to swap a size or colour, the simplest path
              is to return the original piece and place a new order; we will hold the replacement stock for you while
              the return is in transit.
            </p>,
          },
          {
            heading: "7. Faulty pieces",
            body: <p>
              In the unlikely event that a piece arrives with a defect, write to us within fourteen days of receipt with
              photographs of the issue. We will arrange collection at our cost and replace, repair, or refund as you prefer.
            </p>,
          },
        ]}
      />
    </>
  );
}
