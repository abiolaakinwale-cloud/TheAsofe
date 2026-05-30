import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Cookie Preferences",
  description: "What cookies Asofe uses and how to manage your preferences.",
};

const categories = [
  {
    label: "Strictly necessary",
    body: "Required for core site functionality: keeping you signed in, remembering the contents of your bag, and protecting against fraud. These cannot be turned off — switching them off would break the site.",
  },
  {
    label: "Performance & analytics",
    body: "We use Vercel Analytics and Vercel Speed Insights to understand how the site is being used and to keep page-load times fast. These collect anonymous, aggregated data only.",
  },
  {
    label: "Functional",
    body: "Remember preferences like region and currency, and surface relevant catalogue pieces based on what you have viewed.",
  },
  {
    label: "Marketing",
    body: "We do not currently use marketing or advertising cookies. If we ever do, we will update this page and ask for consent before they fire.",
  },
];

export default function CookiePolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="Cookie preferences"
        title="What we set, and why."
        intro="A short, plain-language summary of the cookies and similar technologies Asofe uses."
        ground="var(--color-cream)"
      />

      <section className="py-20 lg:py-28" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[80rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-20">
          <aside className="space-y-6 text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            <p className="eyebrow" style={{ color: "var(--color-oxblood)" }}>Quick summary</p>
            <p>
              Cookies are small files a website stores on your device. We use them sparingly, mostly for keeping the
              site working and understanding aggregate behaviour. We do not sell your data and we do not run
              ad-targeting cookies.
            </p>
            <p>
              You can manage cookies in your browser settings (Settings → Privacy → Cookies). Blocking strictly-necessary
              cookies will prevent you signing in or completing checkout.
            </p>
            <p className="pt-4">
              See also{" "}
              <Link href="/privacy" className="lux-link" style={{ color: "var(--color-ink)" }}>our privacy policy</Link>.
            </p>
          </aside>

          <div className="space-y-12">
            {categories.map(c => (
              <div key={c.label}>
                <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>{c.label}</p>
                <p className="text-base lg:text-lg leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{c.body}</p>
              </div>
            ))}

            <div className="pt-8 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                Questions about how we use cookies? Write to{" "}
                <a href="mailto:privacy@theasofe.com" className="lux-link" style={{ color: "var(--color-ink)" }}>privacy@theasofe.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
