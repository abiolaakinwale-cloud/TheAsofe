import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Our Mission",
  description: "Why Asofe exists, what we believe, and what we are building.",
};

export default function PhilosophyPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Mission"
        title="Connecting African creativity with global customers."
        intro="A few short paragraphs on why we built this and where it is going."
        ground="var(--color-oxblood)"
        inkLight
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[64rem] mx-auto px-6 lg:px-12 space-y-12 text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          <p>
            African designers are making some of the most considered clothing in the world right now. Hand-woven aso oke
            from the looms of Iseyin; bazin riche cut with the precision of a Paris atelier; kente reinterpreted by
            second-generation weavers; bògòlanfini quilts the colour of dry earth. The skill is not the problem.
          </p>

          <p>
            What is the problem is the infrastructure between those ateliers and the people who would buy from them.
            For a diaspora customer in London or Paris or Toronto, buying directly from a Lagos brand means three weeks
            of waiting, customs paperwork, a leap of faith on returns, and — too often — a small heartbreak when the
            piece doesn&apos;t fit.
          </p>

          <p style={{ color: "var(--color-ink)" }} className="serif text-xl lg:text-2xl italic max-w-[44ch]">
            Asofe is the infrastructure that closes that gap.
          </p>

          <p>
            We hold inventory for our designers in our London hub. We fulfil in two to four days. We handle returns
            locally so the customer never has to send anything back to Lagos. We verify each designer before they
            join the platform and we document the provenance of each piece. We pay our designers cleanly and
            quickly, in the currency they prefer.
          </p>

          <p>
            For our designers, that means a real export channel without flying every order across an ocean. For our
            customers, it means the clothes you grew up around — done with the precision of a luxury house, delivered
            with the speed of one.
          </p>

          <p>
            We are not trying to be the cheapest. We are not trying to be the biggest. We are trying to be the most
            trusted place on the internet to buy African fashion. That is a long road. We are at the beginning of it.
          </p>

          <div className="pt-8 border-t" style={{ borderColor: "var(--color-rule)" }}>
            <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>If you are reading this</p>
            <p>
              You are early. We&apos;d love your <Link href="/concierge" className="lux-link" style={{ color: "var(--color-ink)" }}>feedback</Link>,
              your <Link href="/sellers" className="lux-link" style={{ color: "var(--color-ink)" }}>application</Link> if
              you make clothing, or simply that you{" "}
              <a href="mailto:correspondence@theasofe.com" className="lux-link" style={{ color: "var(--color-ink)" }}>write to us</a> with
              what you would want to see here.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
