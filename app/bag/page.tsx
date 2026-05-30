import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getEnrichedBag } from "@/lib/bag";
import { formatPrice } from "@/lib/data";
import { removeFromBag, updateBagQty } from "./actions";
import CheckoutButton from "./CheckoutButton";

export const metadata: Metadata = { title: "Your bag" };

export default async function BagPage() {
  const bag = await getEnrichedBag();

  if (bag.items.length === 0) {
    return (
      <section className="min-h-[60vh] grid place-items-center px-6 py-24" style={{ backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-md text-center">
          <p className="eyebrow mb-6" style={{ color: "var(--color-oxblood)" }}>The bag</p>
          <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>An empty bag.</h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: "var(--color-ink-soft)" }}>
            Nothing in your bag yet. Wander the designers.
          </p>
          <Link href="/brands" className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Browse the designers
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[88rem] mx-auto px-6 lg:px-12">
        <div className="mb-12">
          <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Your bag</p>
          <h1 className="display text-4xl lg:text-5xl" style={{ color: "var(--color-ink)" }}>
            {bag.count} {bag.count === 1 ? "piece" : "pieces"}.
          </h1>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          <ul className="lg:col-span-8 space-y-px">
            {bag.items.map(it => (
              <li
                key={`${it.slug}-${it.size}`}
                className="grid grid-cols-12 gap-4 lg:gap-6 p-6 lg:p-8 items-start"
                style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
              >
                <Link
                  href={`/products/${it.slug}`}
                  className="col-span-3 lg:col-span-2 relative aspect-[4/5] block overflow-hidden"
                  style={{ backgroundColor: "var(--color-cream)" }}
                >
                  <Image
                    src={it.product.images[0]}
                    alt={it.product.name}
                    fill
                    sizes="(max-width: 768px) 25vw, 12vw"
                    className="object-cover"
                  />
                </Link>
                <div className="col-span-9 lg:col-span-6">
                  {it.brand && (
                    <p className="eyebrow mb-2" style={{ color: "var(--color-muted)" }}>{it.brand.name}</p>
                  )}
                  <Link href={`/products/${it.slug}`} className="serif text-xl lux-link" style={{ color: "var(--color-ink)" }}>
                    {it.product.name}
                  </Link>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm max-w-xs">
                    <dt style={{ color: "var(--color-muted)" }}>Size</dt>
                    <dd style={{ color: "var(--color-ink)" }}>{it.size}</dd>
                    <dt style={{ color: "var(--color-muted)" }}>Colour</dt>
                    <dd style={{ color: "var(--color-ink)" }}>{it.product.colour}</dd>
                    <dt style={{ color: "var(--color-muted)" }}>Stock</dt>
                    {it.product.madeToOrder && it.stock === 0 ? (
                      <dd style={{ color: "var(--color-emerald)" }}>
                        Made to order · ships in {it.product.leadTimeWeeks} {it.product.leadTimeWeeks === 1 ? "week" : "weeks"}
                      </dd>
                    ) : (
                      <dd style={{ color: it.stock < 3 ? "var(--color-oxblood)" : "var(--color-ink)" }}>
                        {it.stock < 3 ? `Only ${it.stock} left` : "In stock"}
                      </dd>
                    )}
                  </dl>
                </div>

                <div className="col-span-8 lg:col-span-2 flex items-center gap-1 self-center" >
                  <QtyButton slug={it.slug} size={it.size} qty={it.qty - 1} label="−" disabled={it.qty <= 0} />
                  <span className="inline-flex items-center justify-center min-w-[2.5rem] py-2 px-2 text-sm tabular-nums border" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
                    {it.qty}
                  </span>
                  <QtyButton
                    slug={it.slug}
                    size={it.size}
                    qty={it.qty + 1}
                    label="+"
                    disabled={
                      it.product.madeToOrder ? it.qty >= 9 : it.qty >= it.stock
                    }
                  />
                </div>

                <div className="col-span-4 lg:col-span-2 text-right self-center">
                  <p className="tabular-nums mb-3" style={{ color: "var(--color-ink)" }}>{formatPrice(it.lineSubtotal)}</p>
                  <form action={removeFromBag.bind(null, it.slug, it.size)}>
                    <button type="submit" className="text-[10px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
            <div className="p-8 lg:p-10" style={{ backgroundColor: "var(--color-cream)" }}>
              <p className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>The reckoning</p>
              <dl className="space-y-4 text-base">
                <Row k="Subtotal"  v={formatPrice(bag.subtotal)} />
                <Row k="Shipping" v="Calculated at checkout" muted />
                <hr style={{ borderColor: "var(--color-rule)" }} />
                <Row k="Total"     v={formatPrice(bag.subtotal)} bold />
              </dl>
              <CheckoutButton />
              <p className="text-xs leading-relaxed mt-4" style={{ color: "var(--color-muted)" }}>
                Each piece ships from its designer via Asofe's London fulfilment. Complimentary returns within 28 days.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Row({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className={bold ? "font-medium tabular-nums" : "tabular-nums"} style={{ color: muted ? "var(--color-muted)" : "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}

function QtyButton({ slug, size, qty, label, disabled }: { slug: string; size: string; qty: number; label: string; disabled?: boolean }) {
  const action = updateBagQty.bind(null, slug, size, qty);
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={disabled}
        aria-label={label === "+" ? "Increase quantity" : "Decrease quantity"}
        className="w-9 h-9 border text-base transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-ink)] hover:text-[var(--color-ground)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      >
        {label}
      </button>
    </form>
  );
}
