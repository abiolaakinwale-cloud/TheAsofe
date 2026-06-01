import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getBrands } from "@/lib/queries";
import { formatPrice } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const sb = getAdminSupabase();
  const { data: share } = await sb
    .from("wishlist_shares")
    .select("display_name, is_active")
    .eq("token", token)
    .maybeSingle();
  if (!share || !share.is_active) return { title: "Wishlist not found" };
  const owner = share.display_name ? `${share.display_name}'s` : "A";
  return {
    title: `${owner} Asofe wishlist`,
    description: "A curated selection of pieces from independent African luxury designers, saved on Asofe.",
    robots: { index: false, follow: false },  // share pages are private-by-link
  };
}

export default async function PublicWishlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Look up by token via service-role (anon RLS denies, by design).
  const sb = getAdminSupabase();
  const { data: share } = await sb
    .from("wishlist_shares")
    .select("user_id, token, display_name, message, is_active, updated_at")
    .eq("token", token)
    .maybeSingle();
  if (!share || !share.is_active) notFound();

  // Pull the wished products via service-role
  const { data: rows } = await sb
    .from("wishlist")
    .select("product_slug, created_at")
    .eq("user_id", share.user_id)
    .order("created_at", { ascending: false });
  const slugs = (rows ?? []).map(r => r.product_slug);

  const [productsRes, brands] = await Promise.all([
    slugs.length
      ? sb.from("products")
          .select("slug, name, brand, price, currency, images")
          .in("slug", slugs)
          .eq("published", true)
      : Promise.resolve({ data: [] }),
    getBrands(),
  ]);
  type ProdRow = { slug: string; name: string; brand: string; price: number; currency: string; images: string[] };
  const productBySlug = new Map<string, ProdRow>(((productsRes.data ?? []) as ProdRow[]).map(p => [p.slug, p]));
  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));

  const products = slugs.map(s => productBySlug.get(s)).filter((p): p is ProdRow => !!p);

  const owner = share.display_name ?? "A friend";

  return (
    <section className="py-16 lg:py-24" style={{ backgroundColor: "var(--color-ground)" }}>
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
        <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>A shared wishlist</p>
        <h1 className="display text-4xl lg:text-6xl mb-4 max-w-[18ch]" style={{ color: "var(--color-ink)" }}>
          {owner}&apos;s pieces.
        </h1>
        {share.message ? (
          <p className="serif italic text-xl lg:text-2xl mb-12 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
            &ldquo;{share.message}&rdquo;
          </p>
        ) : (
          <p className="text-base leading-relaxed max-w-xl mb-12" style={{ color: "var(--color-ink-soft)" }}>
            A curated selection from across Asofe. Tap any piece to read the maker&apos;s story.
          </p>
        )}

        {products.length === 0 ? (
          <p className="text-base" style={{ color: "var(--color-ink-soft)" }}>
            This wishlist is empty at the moment.{" "}
            <Link href="/" className="lux-link" style={{ color: "var(--color-ink)" }}>Browse the catalogue</Link>.
          </p>
        ) : (
          <ul className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 mb-16">
            {products.map(p => {
              const brand = brandsBySlug.get(p.brand);
              const img = p.images?.[0];
              return (
                <li key={p.slug}>
                  <Link href={`/products/${p.slug}`} className="block group">
                    <div className="relative aspect-[4/5] mb-4 overflow-hidden" style={{ backgroundColor: "var(--color-cream)" }}>
                      {img && (
                        <Image
                          src={img}
                          alt={p.name}
                          fill
                          sizes="(max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                    </div>
                    {brand && (
                      <p className="text-[10px] tracking-[0.18em] uppercase mb-1" style={{ color: "var(--color-muted)" }}>
                        {brand.name}
                      </p>
                    )}
                    <p className="text-sm leading-snug mb-1" style={{ color: "var(--color-ink)" }}>{p.name}</p>
                    <p className="text-sm tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
                      {formatPrice(p.price, p.currency)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="pt-10 border-t flex flex-wrap items-baseline justify-between gap-4" style={{ borderColor: "var(--color-rule)" }}>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            Curated on{" "}
            <Link href="/" className="lux-link" style={{ color: "var(--color-ink)" }}>Asofe</Link>{" "}
            — a marketplace of independent African luxury designers, UK-fulfilled.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Explore the floor →
          </Link>
        </div>
      </div>
    </section>
  );
}
