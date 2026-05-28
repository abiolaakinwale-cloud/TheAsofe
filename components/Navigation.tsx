"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category } from "@/lib/data";
import SearchOverlay from "./SearchOverlay";

export default function Navigation({
  categories,
  bagCount,
  signedIn,
}: {
  categories: Category[];
  bagCount: number;
  signedIn: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const accountLabel = signedIn ? "Account" : "Log in";
  const accountHref = signedIn ? "/account" : "/signin";

  // Single source of truth for the primary nav — appears once on the
  // desktop sub-row and once in the mobile drawer.
  // Jewellery is surfaced under the Accessories edit, not as its own top-level link.
  const ACCESSORY_SLUGS = new Set(["jewellery"]);
  const headerCategories = categories.filter(c => !ACCESSORY_SLUGS.has(c.slug));

  const primaryLinks: { href: string; label: string; accent?: boolean }[] = [
    ...headerCategories.map(c => ({ href: `/${c.slug}`, label: c.name })),
    { href: "/accessories",  label: "Accessories" },
    { href: "/brands",       label: "Designers" },
    { href: "/new-arrivals", label: "New Arrivals", accent: true },
    { href: "/editorial",    label: "The Journal" },
  ];

  return (
    <header className="sticky top-0 z-40" style={{ backgroundColor: "var(--color-ground)", borderBottom: "1px solid var(--color-rule)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        {/* Row 1 — thin utility strip (desktop only) */}
        <div className="hidden lg:flex items-center justify-between h-8 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
          <p>Complimentary shipping on first orders</p>
          <div className="flex items-center gap-6">
            <Link href={accountHref} className="lux-link">{accountLabel}</Link>
            <Link href="/stockists" className="lux-link">Stockists</Link>
            <span>GBP £</span>
          </div>
        </div>

        {/* Row 2 — main bar: hamburger (mobile) / wordmark (centre) / search + bag */}
        <div className="grid grid-cols-3 items-center py-4 lg:py-5 lg:border-t" style={{ borderColor: "var(--color-rule)" }}>
          {/* Left cell */}
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 -ml-2"
            >
              <span className="block w-5 h-px mb-1.5" style={{ backgroundColor: "var(--color-ink)" }} />
              <span className="block w-5 h-px"        style={{ backgroundColor: "var(--color-ink)" }} />
            </button>
          </div>

          {/* Centre — wordmark */}
          <Link
            href="/"
            className="display text-2xl lg:text-3xl tracking-[0.04em] uppercase font-light justify-self-center"
            style={{ color: "var(--color-ink)" }}
          >
            Asofe
          </Link>

          {/* Right — compact utility */}
          <div className="flex items-center justify-end gap-5 lg:gap-7 text-[11px] tracking-[0.14em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
            <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className="hidden sm:inline lux-link">
              Search
            </button>
            <Link href="/bag" aria-label="Bag" className="lux-link">
              Bag <span style={{ color: "var(--color-muted)" }}>({bagCount})</span>
            </Link>
          </div>
        </div>

        {/* Row 3 — single primary nav (desktop only) */}
        <nav className="hidden lg:flex items-center justify-center gap-7 xl:gap-9 py-3 text-[11px] tracking-[0.14em] uppercase border-t" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
          {primaryLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="lux-link"
              style={l.accent ? { color: "var(--color-accent)" } : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: "var(--color-ground)" }}>
          <div className="px-6 py-6 flex items-center justify-between border-b" style={{ borderColor: "var(--color-rule)" }}>
            <span className="display text-2xl tracking-[0.04em] uppercase font-light">Asofe</span>
            <button type="button" aria-label="Close" onClick={() => setMenuOpen(false)} className="text-xl leading-none">×</button>
          </div>
          <nav className="px-6 py-8 flex flex-col gap-5 text-base tracking-[0.1em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
            {primaryLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                style={l.accent ? { color: "var(--color-accent)" } : undefined}
              >
                {l.label}
              </Link>
            ))}
            <hr className="my-2" style={{ borderColor: "var(--color-rule)" }} />
            <button type="button" onClick={() => { setMenuOpen(false); setSearchOpen(true); }} className="text-left tracking-[0.1em] uppercase font-medium">
              Search
            </button>
            <Link href={accountHref} onClick={() => setMenuOpen(false)}>{accountLabel}</Link>
            <Link href="/stockists"  onClick={() => setMenuOpen(false)}>Stockists</Link>
            <Link href="/bag"        onClick={() => setMenuOpen(false)}>Bag ({bagCount})</Link>
          </nav>
        </div>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
