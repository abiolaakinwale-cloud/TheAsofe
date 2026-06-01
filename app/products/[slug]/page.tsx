import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
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
import { getWishlistSlugs } from "@/lib/wishlist";
import { SITE_URL, SITE_NAME, absoluteUrl } from "@/lib/site";
import { getProductReviews, getProductAggregate } from "@/lib/reviews";
import { getProductQuestions } from "@/lib/questions";
import AddToBag from "./_components/AddToBag";
import { askDesigner } from "./_components/actions";
import ProductCard from "@/components/ProductCard";
import Stars from "@/components/Stars";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const brand = await getBrand(p.brand);
  const title = `${p.name} — ${brand?.name ?? SITE_NAME}`;
  const url = `${SITE_URL}/products/${p.slug}`;
  const ogImage = p.images?.[0] ? absoluteUrl(p.images[0]) : undefined;
  return {
    title,
    description: p.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description: p.description,
      url,
      siteName: SITE_NAME,
      images: ogImage ? [{ url: ogImage, alt: p.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: p.description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ asked?: string; ask_error?: string }>;
}) {
  const { slug } = await params;
  const { asked, ask_error } = await searchParams;
  const product = await getProduct(slug);
  if (!product) notFound();

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();

  const [brand, category, related, sellers, stock, wishlistSlugs, reviews, aggregate, questions] = await Promise.all([
    getBrand(product.brand),
    getCategory(product.category),
    getProductsByBrand(product.brand),
    getSellers(),
    getStock(slug),
    getWishlistSlugs(),
    getProductReviews(slug),
    getProductAggregate(slug),
    getProductQuestions(slug),
  ]);
  const inWishlist = wishlistSlugs.has(slug);
  const seller = sellers.find(s => s.slug === product.seller);
  const more = related.filter(p => p.slug !== product.slug).slice(0, 4);

  const totalStock = Object.values(stock).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map(img => absoluteUrl(img)),
    sku: product.slug,
    ...(brand && { brand: { "@type": "Brand", name: brand.name } }),
    ...(category && { category: category.name }),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: product.currency,
      price: product.price,
      availability: totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(brand && { seller: { "@type": "Organization", name: brand.name } }),
    },
    ...(aggregate.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: aggregate.average,
        reviewCount: aggregate.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...(category ? [{ "@type": "ListItem", position: 2, name: category.name, item: `${SITE_URL}/${category.slug}` }] : []),
      ...(brand ? [{ "@type": "ListItem", position: category ? 3 : 2, name: brand.name, item: `${SITE_URL}/brands/${brand.slug}` }] : []),
      { "@type": "ListItem", position: (category ? 1 : 0) + (brand ? 1 : 0) + 2, name: product.name, item: `${SITE_URL}/products/${product.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* ─── Breadcrumb ──────────────────────────────────────────── */}
      <nav className="border-b" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] tracking-[0.14em] uppercase" style={{ color: "var(--color-muted)" }}>
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
              {aggregate.count > 0 && (
                <div className="mt-2">
                  <a href="#reviews" className="lux-link">
                    <Stars value={aggregate.average} size="sm" showValue count={aggregate.count} />
                  </a>
                </div>
              )}
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

            <AddToBag
              productSlug={product.slug}
              sizes={product.sizes}
              stock={stock}
              colours={product.colours}
              defaultColour={product.colour}
              madeToOrder={product.madeToOrder}
              leadTimeWeeks={product.leadTimeWeeks}
              inWishlist={inWishlist}
            />

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

      {/* ─── Reviews ─────────────────────────────────────────────── */}
      <section id="reviews" className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-ground)" }}>
        <div className="max-w-[88rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
          <div>
            <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>What customers say</p>
            <h2 className="display text-3xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>
              {aggregate.count > 0 ? `${aggregate.average.toFixed(1)} of 5` : "No reviews yet"}.
            </h2>
            {aggregate.count > 0 ? (
              <>
                <Stars value={aggregate.average} size="lg" />
                <p className="text-sm mt-3" style={{ color: "var(--color-ink-soft)" }}>
                  Based on {aggregate.count} verified {aggregate.count === 1 ? "purchase" : "purchases"}.
                </p>
                <ul className="mt-8 space-y-2 text-xs" style={{ color: "var(--color-muted)" }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const n = aggregate.distribution[star - 1] ?? 0;
                    const pct = aggregate.count > 0 ? (n / aggregate.count) * 100 : 0;
                    return (
                      <li key={star} className="flex items-center gap-3">
                        <span className="w-12 tabular-nums">{star} ★</span>
                        <span className="flex-1 h-1.5 relative" style={{ backgroundColor: "var(--color-rule)" }}>
                          <span className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, backgroundColor: "var(--color-saffron)" }} />
                        </span>
                        <span className="w-8 text-right tabular-nums">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                Be the first to write a review. Reviews are verified — only customers who have purchased and received the piece can leave one.
              </p>
            )}
          </div>

          <div>
            {reviews.length > 0 ? (
              <ul className="space-y-10">
                {reviews.map(rv => (
                  <li key={rv.id} className="pb-10 border-b" style={{ borderColor: "var(--color-rule)" }}>
                    <div className="flex items-baseline gap-4 mb-3 flex-wrap">
                      <Stars value={rv.rating} size="sm" />
                      <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-emerald)" }}>
                        Verified purchase
                      </span>
                    </div>
                    {rv.title && <p className="display text-xl mb-2" style={{ color: "var(--color-ink)" }}>{rv.title}</p>}
                    {rv.body && <p className="text-base leading-relaxed mb-4" style={{ color: "var(--color-ink-soft)" }}>{rv.body}</p>}
                    <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                      {rv.customer_name ?? "Anonymous"}
                      {" · "}
                      {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(rv.created_at))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/* ─── Designer Q&A ────────────────────────────────────────── */}
      <section id="questions" className="py-20 lg:py-28 border-t" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
        <div className="max-w-[88rem] mx-auto px-6 lg:px-12 grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
          <div>
            <p className="eyebrow mb-3" style={{ color: "var(--color-cobalt)" }}>Ask the designer</p>
            <h2 className="display text-3xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>
              Questions, answered.
            </h2>
            <p className="text-base leading-relaxed max-w-md" style={{ color: "var(--color-ink-soft)" }}>
              Anything you&apos;d like to know about the fit, fabric, or how this piece is made? Send the question to{" "}
              {brand?.name ?? "the atelier"} directly. Answered questions appear here for future customers.
            </p>
          </div>

          <div>
            {asked === "1" && (
              <div className="mb-8 p-5" style={{ backgroundColor: "var(--color-ground)" }}>
                <p className="eyebrow mb-2" style={{ color: "var(--color-emerald)" }}>Question sent</p>
                <p className="text-sm" style={{ color: "var(--color-ink)" }}>
                  Your question has been sent to {brand?.name ?? "the designer"}. Once they reply you&apos;ll receive an email, and the answer appears below.
                </p>
              </div>
            )}
            {ask_error && (
              <div className="mb-8 p-5" style={{ backgroundColor: "var(--color-ground)" }}>
                <p className="text-sm" style={{ color: "var(--color-oxblood)" }}>
                  Couldn&apos;t send: {decodeURIComponent(ask_error)}
                </p>
              </div>
            )}

            {questions.length > 0 ? (
              <ul className="space-y-10 mb-12">
                {questions.map(q => (
                  <li key={q.id} className="pb-10 border-b" style={{ borderColor: "var(--color-rule)" }}>
                    <p className="text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--color-muted)" }}>
                      {q.customer_name ?? "Anonymous"} asked
                    </p>
                    <p className="serif italic text-lg mb-5" style={{ color: "var(--color-ink)" }}>
                      &ldquo;{q.question}&rdquo;
                    </p>
                    <p className="text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--color-oxblood)" }}>
                      {brand?.name ?? "Atelier"} replied
                    </p>
                    <p className="text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                      {q.answer}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-12 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                No questions answered yet. Be the first — answered Q&amp;A appears publicly here so other customers benefit too.
              </p>
            )}

            {/* Ask form */}
            {user ? (
              <form action={askDesigner} className="space-y-5">
                <input type="hidden" name="productSlug" value={slug} />
                <label className="block">
                  <span className="block mb-2 eyebrow" style={{ color: "var(--color-emerald)" }}>Your question</span>
                  <textarea
                    name="question"
                    required
                    minLength={8}
                    maxLength={1000}
                    rows={4}
                    placeholder="e.g. Does the silk crepe stretch at all, or does it sit close to the body?"
                    className="w-full border bg-transparent p-3 text-base leading-relaxed"
                    style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                  />
                </label>
                <label className="block">
                  <span className="block mb-2 eyebrow" style={{ color: "var(--color-emerald)" }}>Display name</span>
                  <input
                    name="displayName"
                    maxLength={60}
                    defaultValue={user.email?.split("@")[0] ?? ""}
                    className="w-full h-12 border bg-transparent px-3 text-base"
                    style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                  />
                  <span className="block mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
                    Shown publicly with your question once answered. Use a first name or alias if you prefer.
                  </span>
                </label>
                <button
                  type="submit"
                  className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
                >
                  Send to the designer
                </button>
              </form>
            ) : (
              <div className="p-6" style={{ backgroundColor: "var(--color-ground)" }}>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-ink)" }}>
                  <Link href={`/signin?next=/products/${slug}%23questions`} className="lux-link" style={{ color: "var(--color-ink)" }}>
                    Sign in
                  </Link>{" "}or{" "}
                  <Link href={`/signin?next=/products/${slug}%23questions`} className="lux-link" style={{ color: "var(--color-ink)" }}>
                    create an account
                  </Link>{" "}to ask {brand?.name ?? "the designer"} a question. We&apos;ll email you when they reply.
                </p>
              </div>
            )}
          </div>
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
                <ProductCard
                  key={p.slug}
                  product={p}
                  brand={brand ?? undefined}
                  inWishlist={wishlistSlugs.has(p.slug)}
                />
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
