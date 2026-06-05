import Link from "next/link";
import NewsletterForm from "@/components/NewsletterForm";

const customerCareCommerce = [
  { label: "Contact", href: "/contact" },
  { label: "Shipping & Delivery", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Buyer Protection", href: "/buyer-protection" },
  { label: "Care Guide", href: "/care" },
  { label: "Authentication", href: "/authentication" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Gift Cards", href: "/gift-cards" },
];

const customerCarePrelaunch = [
  { label: "Contact", href: "/contact" },
  { label: "Buyer Protection", href: "/buyer-protection" },
];

const companyCommerce = [
  { label: "Our Mission", href: "/philosophy" },
  { label: "The Journal", href: "/editorial" },
  { label: "Sell on Asofe", href: "/sellers" },
  { label: "Concierge", href: "/concierge" },
  { label: "Press", href: "/press" },
  { label: "Careers", href: "/careers" },
];

const companyPrelaunch = [
  { label: "Our Mission", href: "/philosophy" },
  { label: "The Journal", href: "/editorial" },
  { label: "Sell on Asofe", href: "/sellers" },
  { label: "Press", href: "/press" },
  { label: "Careers", href: "/careers" },
];

const socials = [
  { label: "Instagram", href: "https://instagram.com/asofefashion" },
  { label: "TikTok",    href: "https://tiktok.com/@asofefashion" },
  { label: "Pinterest", href: "https://pinterest.com/asofefashion" },
];

const legal = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Cookie Preferences", href: "/cookies" },
];

export default function Footer({ commerce = true }: { commerce?: boolean } = {}) {
  const customerCare = commerce ? customerCareCommerce : customerCarePrelaunch;
  const company = commerce ? companyCommerce : companyPrelaunch;
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
        <div className="col-span-2 lg:col-span-1">
          <p className="eyebrow mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>Get in touch</p>
          <p className="display text-2xl lg:text-3xl mb-3 leading-tight">
            Lagos &amp; London.
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            Office address shared on request.<br />
            <a href="mailto:correspondence@theasofe.com" className="lux-link">correspondence@theasofe.com</a>
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1">
          <p className="eyebrow mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>Follow</p>
          <ul className="space-y-3 text-sm">
            {socials.map(s => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lux-link"
                  style={{ color: "rgba(255,255,255,0.78)" }}
                >
                  {s.label} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Trading info — UK Companies Act 2006 s.82 disclosure */}
      <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-8 text-[11px] leading-relaxed tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
          <p className="max-w-3xl">
            Asofe is a trading name of <span style={{ color: "rgba(255,255,255,0.72)" }}>Kadd Consulting Limited</span>,
            a company registered in England and Wales · Company number{" "}
            <span style={{ color: "rgba(255,255,255,0.72)" }}>15467682</span>{" "}
            · Registered office: 33 Lansbury Road, Newton Leys, Bletchley, Bucks, United Kingdom, MK3 5QP.
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
