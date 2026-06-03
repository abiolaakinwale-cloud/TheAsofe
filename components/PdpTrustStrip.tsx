type Item = { eyebrow: string; title: string };

const ITEMS: Item[] = [
  { eyebrow: "UK Fulfilment",     title: "Dispatched 2–4 working days" },
  { eyebrow: "Verified Designer", title: "Vetted before listing" },
  { eyebrow: "Secure Checkout",   title: "Stripe · 3D Secure · PCI-DSS" },
  { eyebrow: "Complimentary Returns", title: "7 days from delivery" },
];

export default function PdpTrustStrip() {
  return (
    <ul
      className="grid grid-cols-2 lg:grid-cols-4 gap-px border-t border-b mt-4"
      style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-rule)" }}
      aria-label="Marketplace assurances"
    >
      {ITEMS.map(item => (
        <li
          key={item.eyebrow}
          className="px-4 py-3"
          style={{ backgroundColor: "var(--color-ground)" }}
        >
          <p className="text-[10px] tracking-[0.22em] uppercase font-medium" style={{ color: "var(--color-emerald)" }}>
            {item.eyebrow}
          </p>
          <p className="text-xs mt-1 leading-snug" style={{ color: "var(--color-ink)" }}>
            {item.title}
          </p>
        </li>
      ))}
    </ul>
  );
}
