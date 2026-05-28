import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getBrand,
  getCategory,
  getProduct,
  getProducts,
  getProductsByBrand,
  getSellers,
} from "@/lib/queries";
import { formatPrice } from "@/lib/data";
import { getStock } from "@/lib/bag";
import AddToBag from "./_components/AddToBag";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const brand = await getBrand(p.brand);
  return {
    title: `${p.name} — ${brand?.name ?? ""}`,
    description: p.description,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [brand, category, related, sellers, stock] = await Promise.all([
    getBrand(product.brand),
    getCategory(product.category),
    getProductsByBrand(product.brand),
    getSellers(),
    getStock(slug),
  ]);
  const seller = sellers.find(s => s.slug === product.seller);
  const more = related.filter(p => p.slug !== product.slug).slice(0, 4);

  return (
    <>
      {/* ─── Breadcrumb ──────────────────────────────────────────── */}
      <nav className="border-b" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-4 flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>
          <Link href="/" className="lux-link">Home</Link>
          <span>/</span>
          {category && (
            <>
              <Link href={`/${category.slug}`} className="lux-link">{category.name}</Link>
              <span>/</span>
            </>
          )}
          {brand && (
            <>
              <Link href={`/brands/${brand.slug}`} className="lux-link">{brand.name}</Link>
              <span>/</span>
            </>
          )}
          <span style={{ color: "var(--color-ink)" }}>{product.name}</span>
        </div>
      </nav>

      {/* ─── Gallery + info ──────────────────────────────────────── */}
      <section className="py-10 lg:py-16">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Gallery */}
          <div className="lg:col-span-7 space-y-3 lg:space-y-4">
            {product.images.map((src, i) => (
              <div key={i} className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
                <Image
                  src={src}
                  alt={`${product.name} — view ${i + 1}`}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <aside className="lg:col-span-5 lg:sticky lg:top-32 lg:self-start space-y-8">
            <header>
              {brand && (
                <Link href={`/brands/${brand.slug}`} className="eyebrow lux-link mb-4 inline-block" style={{ color: "var(--color-oxblood)" }}>
                  {brand.name}
                </Link>
              )}
              <h1 className="display text-3xl lg:text-5xl mb-3 max-w-[18ch]">{product.name}</h1>
              <p className="text-lg tabular-nums" style={{ color: "var(--color-ink)" }}>{formatPrice(product.price)}</p>
              {product.newArrival && (
                <span className="inline-block mt-3 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase font-medium"
                  style={{ backgroundColor: "var(--color-saffron)", color: "var(--color-ink)" }}>
                  New arrival
                </span>
              )}
            </header>

            <p className="text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              {product.description}
            </p>

            <AddToBag productSlug={product.slug} sizes={product.sizes} stock={stock} />

            {/* Seller attribution */}
            {seller && (
              <div className="border-t pt-6" style={{ borderColor: "var(--color-rule)" }}>
                <p className="eyebrow mb-3" style={{ color: "var(--color-cobalt)" }}>Fulfilled by</p>
                <p className="serif text-xl" style={{ color: "var(--color-ink)" }}>{seller.name}</p>
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  {seller.type} · {seller.location}
                </p>
              </div>
            )}

            {/* Specifications */}
            <div className="border-t pt-6" style={{ borderColor: "var(--color-rule)" }}>
              <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>The Particulars</p>
              <dl className="space-y-3 text-sm">
                <Row k="Composition" v={product.composition.join(", ")} />
                <Row k="Made in" v={product.madeIn} />
                <Row k="Colour" v={product.colour} />
                {category && <Row k="Department" v={category.name} />}
              </dl>
            </div>

            {/* Care note */}
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
              Each piece is shipped from its designer of origin, accompanied by certificate of authenticity and care guidance.
              Complimentary returns within 28 days. Items in their original condition only.
            </p>
          </aside>
        </div>
      </section>

      {/* ─── More from this designer ────────────────────────────── */}
      {more.length > 0 && brand && (
        <section className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
          <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
            <div className="flex items-end justify-between mb-12">
              <div>
                <span className="rule mb-6" />
                <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>More from this designer</p>
                <h2 className="display text-3xl lg:text-5xl">{brand.name}.</h2>
              </div>
              <Link href={`/brands/${brand.slug}`} className="text-[12px] tracking-[0.18em] uppercase font-medium lux-link hidden sm:inline-flex" style={{ color: "var(--color-ink)" }}>
                View the house
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-x-10 gap-y-14">
              {more.map(p => (
                <Link key={p.slug} href={`/products/${p.slug}`} className="group block">
                  <div className="relative aspect-[4/5] mb-4 overflow-hidden" style={{ backgroundColor: "var(--color-ground)" }}>
                    <Image src={p.images[0]} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover product-image" />
                  </div>
                  <p className="eyebrow mb-1" style={{ color: "var(--color-muted)" }}>{brand?.name}</p>
                  <div className="flex items-start justify-between gap-4">
                    <p className="serif text-base leading-snug">{p.name}</p>
                    <p className="text-sm tabular-nums whitespace-nowrap" style={{ color: "var(--color-ink-soft)" }}>{formatPrice(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-4">
      <dt className="w-32 flex-shrink-0 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd style={{ color: "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}
