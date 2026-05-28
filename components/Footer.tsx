import Link from "next/link";
import NewsletterForm from "@/components/NewsletterForm";

const customerCare = [
  { label: "Contact", href: "/contact" },
  { label: "Shipping & Delivery", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Care Guide", href: "/care" },
  { label: "Authentication", href: "/authentication" },
  { label: "Size Guide", href: "/size-guide" },
];

const company = [
  { label: "Our Philosophy", href: "/philosophy" },
  { label: "The Journal", href: "/editorial" },
  { label: "Sell on Asofe", href: "/sellers" },
  { label: "Press", href: "/press" },
  { label: "Careers", href: "/careers" },
];

const legal = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Cookie Preferences", href: "/cookies" },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
      {/* Newsletter band */}
      <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>The Correspondence</p>
            <h2 className="display text-3xl lg:text-5xl mb-5">
              Letters from the houses.
            </h2>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.55)" }}>
              A quarterly newsletter. New collections, atelier visits, and the occasional considered essay. We write rarely; we hope you read carefully.
            </p>
          </div>
          <div className="lg:justify-self-end w-full lg:max-w-md">
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-14 grid grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <p className="eyebrow mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>Asofe</p>
          <ul className="space-y-3 text-sm">
            {company.map(l => (
              <li key={l.href}>
                <Link href={l.href} style={{ color: "rgba(255,255,255,0.78)" }} className="lux-link">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>Customer Care</p>
          <ul className="space-y-3 text-sm">
            {customerCare.map(l => (
              <li key={l.href}>
                <Link href={l.href} style={{ color: "rgba(255,255,255,0.78)" }} className="lux-link">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 lg:col-span-2">
          <p className="eyebrow mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>Headquarters</p>
          <p className="display text-2xl lg:text-3xl mb-3 leading-tight">
            12 Awolowo Road<br />Ikoyi, Lagos
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            By appointment only.<br />
            <a href="mailto:correspondance@theasofe.com" className="lux-link">correspondance@theasofe.com</a>
          </p>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-[11px] tracking-[0.14em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
          <p>© {new Date().getFullYear()} Asofe. A house of independent designers.</p>
          <ul className="flex flex-wrap items-center gap-6">
            {legal.map(l => (
              <li key={l.href}>
                <Link href={l.href} className="lux-link">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
