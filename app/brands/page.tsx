import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getBrands, getProducts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "The Designers",
  description: "Eight independent houses curated by Asofe.",
};

export default async function BrandsPage() {
  const [brands, products] = await Promise.all([getBrands(), getProducts()]);
  const productsByBrand = (slug: string) => products.filter(p => p.brand === slug);
  return (
    <>
      <section style={{ backgroundColor: "var(--color-cobalt)", color: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>The Designers</p>
          <h1 className="display text-[clamp(2.6rem,6vw,5.4rem)] max-w-[18ch] mb-8">
            A house for every preference.
          </h1>
          <p className="text-base lg:text-lg leading-relaxed max-w-xl" style={{ color: "rgba(255,255,255,0.75)" }}>
            Eight independent African designers, each chosen for the integrity of their craft. From the looms of Iseyin to
            the workshops of Marrakech, every garment passes a quiet test before it appears here.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 space-y-16 lg:space-y-24">
          {brands.map((b, i) => {
            const count = productsByBrand(b.slug).length;
            const reverse = i % 2 === 1;
            return (
              <Link
                href={`/brands/${b.slug}`}
                key={b.slug}
                className="group grid lg:grid-cols-12 gap-8 lg:gap-16 items-center"
              >
                <div className={`relative aspect-[4/5] overflow-hidden lg:col-span-6 ${reverse ? "lg:order-2" : ""}`} style={{ backgroundColor: "var(--color-cream)" }}>
                  <Image
                    src={b.heroImage}
                    alt={b.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover product-image"
                  />
                </div>
                <div className="lg:col-span-6">
                  <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>{b.origin} · est. {b.founded}</p>
                  <h2 className="display text-3xl lg:text-5xl mb-5">{b.name}</h2>
                  <p className="text-base lg:text-lg leading-relaxed mb-6 max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
                    {b.story}
                  </p>
                  <span className="text-[12px] tracking-[0.18em] uppercase font-medium pb-1 border-b" style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}>
                    {count} pieces in the house →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
