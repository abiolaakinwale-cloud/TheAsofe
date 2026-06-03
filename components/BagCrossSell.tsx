import Link from "next/link";
import Image from "next/image";
import { getCoPurchased } from "@/lib/recommendations";
import { formatPrice } from "@/lib/data";
import BagCrossSellClickTracker from "./BagCrossSellClickTracker";

type Props = { bagSlugs: string[] };

// Server component — renders co-purchase recommendations on the bag page.
// Quietly renders nothing when there isn't enough order history to fill 2+ cards.
export default async function BagCrossSell({ bagSlugs }: Props) {
  if (bagSlugs.length === 0) return null;
  const recs = await getCoPurchased(bagSlugs, 4);
  if (recs.length < 2) return null;

  return (
    <section className="mt-16 lg:mt-20 pt-12 border-t" style={{ borderColor: "var(--color-rule)" }}>
      <div className="mb-8">
        <p className="eyebrow mb-2" style={{ color: "var(--color-oxblood)" }}>Often paired</p>
        <h2 className="display text-2xl lg:text-3xl" style={{ color: "var(--color-ink)" }}>
          Customers also chose.
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-x-8 gap-y-10">
        {recs.map(r => (
          <Link
            key={r.product.slug}
            href={`/products/${r.product.slug}`}
            className="group block"
            data-cross-sell-slug={r.product.slug}
          >
            <div className="relative aspect-[4/5] overflow-hidden mb-3" style={{ backgroundColor: "var(--color-cream)" }}>
              {r.product.images[0] && (
                <Image
                  src={r.product.images[0]}
                  alt={r.product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 22vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              )}
            </div>
            {r.brand && (
              <p className="eyebrow mb-1" style={{ color: "var(--color-muted)" }}>{r.brand.name}</p>
            )}
            <p className="serif text-base mb-1 lux-link" style={{ color: "var(--color-ink)" }}>
              {r.product.name}
            </p>
            <p className="text-sm tabular-nums" style={{ color: "var(--color-ink)" }}>
              {formatPrice(r.product.price)}
            </p>
          </Link>
        ))}
      </div>
      <BagCrossSellClickTracker />
    </section>
  );
}
