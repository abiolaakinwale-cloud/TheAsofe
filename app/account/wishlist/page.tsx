import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAnonSupabase } from "@/lib/supabase/anon";
import { getBrands } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";
import ProductCard from "@/components/ProductCard";
import { enableWishlistSharing, rotateWishlistToken, disableWishlistSharing, updateShareCopy } from "./share-actions";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default async function WishlistPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account/wishlist");

  // 1. Fetch the slugs the user has wishlisted (newest first)
  const { data: rows } = await sb
    .from("wishlist")
    .select("product_slug, created_at")
    .order("created_at", { ascending: false });
  const slugs = (rows ?? []).map(r => r.product_slug);

  // 2. Hydrate product + brand data via anon client (catalog reads are public)
  const anon = getAnonSupabase();
  const [productsRes, brands] = await Promise.all([
    slugs.length
      ? anon
          .from("products")
          .select(
            "slug, name, brand, seller, category, subcategory, price, currency, description, composition, made_in, sizes, colour, images, new_arrival, featured, made_to_order, lead_time_weeks"
          )
          .in("slug", slugs)
      : Promise.resolve({ data: [] }),
    getBrands(),
  ]);
  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));

  const productBySlug = new Map((productsRes.data ?? []).map(p => [p.slug, p]));
  // Preserve wishlist order (newest-saved first)
  const products = slugs
    .map(s => productBySlug.get(s))
    .filter((p): p is NonNullable<typeof p> => !!p);

  // Share record (one row per customer)
  const { data: share } = await sb
    .from("wishlist_shares")
    .select("token, display_name, message, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  const shareActive = !!share && share.is_active;
  const shareUrl = share ? `${SITE_URL}/wishlists/${share.token}` : null;

  return (
    <>
      <Link href="/account" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Overview
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Saved for later</p>
      <h1 className="display text-4xl lg:text-5xl mb-8" style={{ color: "var(--color-ink)" }}>Wishlist.</h1>

      {/* Share panel */}
      <div className="mb-12 p-6 max-w-3xl" style={{ backgroundColor: "var(--color-cream)" }}>
        <p className="eyebrow mb-3" style={{ color: "var(--color-emerald)" }}>Share your wishlist</p>
        {shareActive && shareUrl ? (
          <>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-ink-soft)" }}>
              Anyone with this link can see the pieces you&apos;ve saved. They cannot see your name or email unless you choose to show them.
            </p>
            <div className="flex items-center gap-2 mb-5">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 h-10 border bg-transparent px-3 text-xs font-mono"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
              />
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-4 inline-flex items-center text-[10px] tracking-[0.22em] uppercase font-medium border"
                style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
              >
                Preview
              </a>
            </div>

            <form action={updateShareCopy} className="grid sm:grid-cols-2 gap-4 mb-5">
              <label className="block">
                <span className="block mb-1.5 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Display name</span>
                <input
                  name="display_name"
                  defaultValue={share.display_name ?? ""}
                  maxLength={60}
                  placeholder="Leave blank to stay anonymous"
                  className="w-full h-10 border bg-transparent px-3 text-sm"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                />
              </label>
              <label className="block">
                <span className="block mb-1.5 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Note</span>
                <input
                  name="message"
                  defaultValue={share.message ?? ""}
                  maxLength={200}
                  placeholder="e.g. things I'd love this birthday"
                  className="w-full h-10 border bg-transparent px-3 text-sm"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                />
              </label>
              <button
                type="submit"
                className="sm:col-span-2 justify-self-start px-5 py-2 text-[10px] tracking-[0.22em] uppercase font-medium"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
              >
                Save
              </button>
            </form>

            <div className="flex flex-wrap gap-4 pt-4 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <form action={rotateWishlistToken}>
                <button type="submit" className="text-[10px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-cobalt)" }}>
                  Generate new link
                </button>
              </form>
              <form action={disableWishlistSharing}>
                <button type="submit" className="text-[10px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-oxblood)" }}>
                  Disable sharing
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-ink-soft)" }}>
              Generate a private link to share your wishlist — useful for gift hints or partners deciding together. You can revoke or rotate the link at any time.
            </p>
            <form action={enableWishlistSharing} className="grid sm:grid-cols-2 gap-4 mb-5">
              <label className="block">
                <span className="block mb-1.5 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Display name (optional)</span>
                <input
                  name="display_name"
                  maxLength={60}
                  placeholder="Leave blank to stay anonymous"
                  className="w-full h-10 border bg-transparent px-3 text-sm"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                />
              </label>
              <label className="block">
                <span className="block mb-1.5 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>Note (optional)</span>
                <input
                  name="message"
                  maxLength={200}
                  placeholder="e.g. things I'd love this birthday"
                  className="w-full h-10 border bg-transparent px-3 text-sm"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                />
              </label>
              <button
                type="submit"
                className="sm:col-span-2 justify-self-start px-5 py-2 text-[10px] tracking-[0.22em] uppercase font-medium"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
              >
                Generate shareable link
              </button>
            </form>
          </>
        )}
      </div>

      {products.length === 0 ? (
        <div className="max-w-xl space-y-4">
          <p className="text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Nothing saved yet. Tap the heart on any piece you want to keep an eye on — they&apos;ll all collect here.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Start browsing →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 lg:gap-x-6 gap-y-12">
          {products.map(p => {
            const mappedProduct = {
              slug: p.slug,
              name: p.name,
              brand: p.brand,
              seller: p.seller,
              category: p.category,
              subcategory: p.subcategory ?? undefined,
              price: p.price,
              currency: p.currency,
              description: p.description,
              composition: p.composition,
              madeIn: p.made_in,
              sizes: p.sizes,
              colour: p.colour,
              images: p.images,
              newArrival: p.new_arrival || undefined,
              featured: p.featured || undefined,
              madeToOrder: p.made_to_order || undefined,
              leadTimeWeeks: p.lead_time_weeks ?? undefined,
            };
            return (
              <ProductCard
                key={p.slug}
                product={mappedProduct}
                brand={brandsBySlug.get(p.brand)}
                inWishlist
              />
            );
          })}
        </div>
      )}
    </>
  );
}
