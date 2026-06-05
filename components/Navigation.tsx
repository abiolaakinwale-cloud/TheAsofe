"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/data";
import SearchOverlay from "./SearchOverlay";
import { SUBCATEGORIES, type Subcategory } from "@/lib/subcategories";

type PrimaryLink = {
  href: string;
  label: string;
  subKey?: string;       // key into SUBCATEGORIES
  accent?: boolean;
};

export default function Navigation({
  categories,
  bagCount,
  signedIn,
  commerce,
}: {
  categories: Category[];
  bagCount: number;
  signedIn: boolean;
  commerce: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileSub, setOpenMobileSub] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close every menu state when the route changes — covers same-row link clicks,
  // mobile drawer dismissal after navigation, and any programmatic redirect.
  useEffect(() => {
    setOpenDropdown(null);
    setOpenMobileSub(null);
    setMenuOpen(false);
  }, [pathname]);

  const accountLabel = signedIn ? "Account" : "Log in";
  const accountHref = signedIn ? "/account" : "/signin";

  // Jewellery is surfaced under the Accessories edit, not as its own top-level link.
  const ACCESSORY_SLUGS = new Set(["jewellery"]);
  const headerCategories = categories.filter(c => !ACCESSORY_SLUGS.has(c.slug));

  const commerceLinks: PrimaryLink[] = [
    ...headerCategories.map(c => ({
      href: `/${c.slug}`,
      label: c.name,
      subKey: SUBCATEGORIES[c.slug] ? c.slug : undefined,
    })),
    { href: "/accessories",  label: "Accessories", subKey: "accessories" },
    { href: "/collections",  label: "Collections" },
    { href: "/brands",       label: "Designers" },
    { href: "/new-arrivals", label: "New Arrivals" },
  ];

  const primaryLinks: PrimaryLink[] = commerce
    ? [...commerceLinks, { href: "/editorial", label: "The Journal" }]
    : [
        { href: "/philosophy", label: "Our Mission" },
        { href: "/editorial",  label: "The Journal" },
        { href: "/sellers",    label: "Sell on Asofe", accent: true },
        { href: "/contact",    label: "Contact" },
      ];

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!openDropdown) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDropdown]);

  return (
    <header className="sticky top-0 z-40" style={{ backgroundColor: "var(--color-ground)", borderBottom: "1px solid var(--color-rule)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        {/* Row 1 — thin utility strip (desktop only) */}
        <div className="hidden lg:flex items-center justify-between h-8 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
          <p>{commerce ? "Complimentary shipping on first orders" : "Opening soon · Founding designer applications open"}</p>
          <div className="flex items-center gap-6">
            <Link href={accountHref} className="lux-link">{accountLabel}</Link>
            {commerce && <Link href="/stockists" className="lux-link">Stockists</Link>}
            <span>GBP £</span>
          </div>
        </div>

        {/* Row 2 — main bar: hamburger (mobile) / wordmark (centre) / search + bag */}
        <div className="grid grid-cols-3 items-center py-4 lg:py-5 lg:border-t" style={{ borderColor: "var(--color-rule)" }}>
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="lg:hidden w-11 h-11 -ml-3 flex flex-col items-start justify-center"
            >
              <span className="block w-5 h-px mb-1.5" style={{ backgroundColor: "var(--color-ink)" }} />
              <span className="block w-5 h-px"        style={{ backgroundColor: "var(--color-ink)" }} />
            </button>
          </div>

          <Link
            href="/"
            className="display text-2xl lg:text-3xl tracking-[0.04em] uppercase font-light justify-self-center"
            style={{ color: "var(--color-ink)" }}
          >
            Asofe
          </Link>

          <div className="flex items-center justify-end gap-5 lg:gap-7 text-[11px] tracking-[0.14em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
            {commerce ? (
              <>
                <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)} className="hidden sm:inline lux-link uppercase tracking-[0.14em]">
                  SEARCH
                </button>
                <Link href="/bag" aria-label="Bag" className="lux-link">
                  Bag <span style={{ color: "var(--color-muted)" }}>({bagCount})</span>
                </Link>
              </>
            ) : (
              <Link href="/sellers" className="lux-link">
                Apply
              </Link>
            )}
          </div>
        </div>

        {/* Row 3 — single primary nav (desktop only) */}
        <nav
          ref={dropdownRef}
          className="hidden lg:flex items-center justify-center gap-7 xl:gap-9 py-3 text-[11px] tracking-[0.14em] uppercase border-t relative"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        >
          {primaryLinks.map(l => {
            const subs = l.subKey ? SUBCATEGORIES[l.subKey] : undefined;
            const isOpen = openDropdown === l.href;
            const baseClass = "lux-link text-[11px] tracking-[0.14em] uppercase font-medium";
            if (!subs) {
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpenDropdown(null)}
                  className={baseClass}
                  style={{ color: "var(--color-ink)" }}
                >
                  {l.label}
                </Link>
              );
            }
            return (
              <button
                key={l.href}
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setOpenDropdown(isOpen ? null : l.href)}
                className={`${baseClass} inline-flex items-center gap-1.5`}
                style={{ color: "var(--color-ink)" }}
              >
                {l.label}
                <span aria-hidden style={{ color: "var(--color-muted)", fontSize: "0.7em" }}>▾</span>
              </button>
            );
          })}

          {openDropdown && (
            <DesktopDropdown
              link={primaryLinks.find(l => l.href === openDropdown)!}
              subcategories={SUBCATEGORIES[primaryLinks.find(l => l.href === openDropdown)!.subKey!]}
              onClose={() => setOpenDropdown(null)}
            />
          )}
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: "var(--color-ground)" }}>
          <div className="px-6 py-6 flex items-center justify-between border-b" style={{ borderColor: "var(--color-rule)" }}>
            <span className="display text-2xl tracking-[0.04em] uppercase font-light">Asofe</span>
            <button type="button" aria-label="Close" onClick={() => setMenuOpen(false)} className="text-2xl leading-none w-11 h-11 -mr-3 flex items-center justify-center">×</button>
          </div>
          <nav className="px-6 py-8 flex flex-col gap-1 text-base tracking-[0.1em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
            {primaryLinks.map(l => {
              const subs = l.subKey ? SUBCATEGORIES[l.subKey] : undefined;
              if (!subs) {
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="py-3"
                    style={l.accent ? { color: "var(--color-accent)" } : undefined}
                  >
                    {l.label}
                  </Link>
                );
              }
              const open = openMobileSub === l.href;
              return (
                <div key={l.href} className="border-b" style={{ borderColor: "var(--color-rule)" }}>
                  <button
                    type="button"
                    onClick={() => setOpenMobileSub(open ? null : l.href)}
                    className="w-full py-3 flex items-center justify-between text-left"
                    aria-expanded={open}
                  >
                    <span>{l.label}</span>
                    <span aria-hidden style={{ color: "var(--color-muted)" }}>{open ? "−" : "+"}</span>
                  </button>
                  {open && (
                    <div className="pl-4 pb-4 flex flex-col gap-3 text-sm normal-case tracking-normal font-normal" style={{ color: "var(--color-ink-soft)" }}>
                      <Link href={l.href} onClick={() => setMenuOpen(false)} className="font-medium" style={{ color: "var(--color-ink)" }}>
                        Shop all {l.label}
                      </Link>
                      {subs.map(s => (
                        <Link key={s.slug} href={`${l.href}/${s.slug}`} onClick={() => setMenuOpen(false)}>
                          {s.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <hr className="my-3" style={{ borderColor: "var(--color-rule)" }} />
            {commerce && (
              <button type="button" onClick={() => { setMenuOpen(false); setSearchOpen(true); }} className="text-left py-2 tracking-[0.1em] uppercase font-medium">
                SEARCH
              </button>
            )}
            <Link href={accountHref} onClick={() => setMenuOpen(false)} className="py-2">{accountLabel}</Link>
            {commerce && (
              <>
                <Link href="/stockists" onClick={() => setMenuOpen(false)} className="py-2">Stockists</Link>
                <Link href="/bag"       onClick={() => setMenuOpen(false)} className="py-2">Bag ({bagCount})</Link>
              </>
            )}
          </nav>
        </div>
      )}

      {commerce && <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </header>
  );
}

function DesktopDropdown({
  link,
  subcategories,
  onClose,
}: {
  link: PrimaryLink;
  subcategories: Subcategory[];
  onClose: () => void;
}) {
  // Wrap into two columns when there are > 6 items so the panel stays balanced.
  const useTwoCols = subcategories.length > 6;
  return (
    <div
      role="menu"
      className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 border shadow-sm"
      style={{
        backgroundColor: "var(--color-ground)",
        borderColor: "var(--color-rule)",
        minWidth: useTwoCols ? "32rem" : "16rem",
      }}
    >
      <div className="p-6 lg:p-8">
        <Link
          href={link.href}
          onClick={onClose}
          className="block mb-4 pb-3 border-b text-[11px] tracking-[0.18em] uppercase font-medium"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
        >
          Shop all {link.label} →
        </Link>
        <ul className={useTwoCols ? "grid grid-cols-2 gap-x-10 gap-y-2.5" : "flex flex-col gap-2.5"}>
          {subcategories.map(s => (
            <li key={s.slug}>
              <Link
                href={`${link.href}/${s.slug}`}
                onClick={onClose}
                className="text-sm normal-case tracking-normal lux-link"
                style={{ color: "var(--color-ink-soft)" }}
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
