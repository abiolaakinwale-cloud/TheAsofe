import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getCategories } from "@/lib/queries";
import { updateProduct, updateStock } from "../../actions";
import ProductFields from "../../_components/ProductFields";

export default async function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/brand-signin?next=/dashboard/products/${slug}/edit`);
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (profile?.role !== "seller" || !profile.brand) redirect("/dashboard");

  const admin = getAdminSupabase();
  const [{ data: product }, { data: stockRows }] = await Promise.all([
    admin.from("products").select("*").eq("slug", slug).maybeSingle(),
    admin.from("stock_levels").select("size, quantity").eq("product_slug", slug),
  ]);
  if (!product) notFound();
  if (product.brand !== profile.brand) redirect("/dashboard/products");

  const stockBySize = new Map<string, number>((stockRows ?? []).map(r => [r.size, r.quantity]));
  const categories = await getCategories();

  return (
    <>
      <Link href="/dashboard/products" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Back to collection
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Edit piece</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>{product.name}.</h1>

      <form action={updateProduct.bind(null, slug)} className="space-y-8 max-w-4xl">
        <ProductFields
          categories={categories}
          brand={profile.brand}
          productSlug={product.slug}
          d={{
            slug: product.slug,
            name: product.name,
            category: product.category,
            subcategory: product.subcategory,
            price: product.price,
            colour: product.colour,
            made_in: product.made_in,
            sizes: product.sizes,
            composition: product.composition,
            images: product.images,
            description: product.description,
            published: product.published,
            new_arrival: product.new_arrival,
            featured: product.featured,
            made_to_order: product.made_to_order,
            lead_time_weeks: product.lead_time_weeks,
          }}
        />
        <div className="pt-4 flex gap-4 flex-wrap">
          <button type="submit" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Save changes
          </button>
          <Link href="/dashboard/products" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
            Cancel
          </Link>
        </div>
      </form>

      {/* ─── Stock ─────────────────────────────────────────────── */}
      <section className="mt-20 max-w-4xl pt-12 border-t" style={{ borderColor: "var(--color-rule)" }}>
        <p className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Stock</p>
        <h2 className="display text-2xl lg:text-3xl mb-2" style={{ color: "var(--color-ink)" }}>How many of each size are at the UK hub?</h2>
        <p className="text-sm mb-8 max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
          These figures show what Asofe is currently holding for you. When a customer orders, the count drops automatically.
        </p>

        <form action={updateStock.bind(null, slug)} className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {(product.sizes as string[]).map(size => (
              <label key={size} className="flex items-center justify-between gap-4 py-3 border-b" style={{ borderColor: "var(--color-rule)" }}>
                <span className="text-sm tracking-[0.14em] uppercase" style={{ color: "var(--color-ink)" }}>{size}</span>
                <input
                  name={`stock__${size}`}
                  type="number"
                  min={0}
                  defaultValue={stockBySize.get(size) ?? 0}
                  className="w-20 bg-transparent border-b py-1 text-right text-sm tabular-nums outline-none focus:border-[var(--color-ink)]"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
                />
              </label>
            ))}
          </div>
          <button type="submit" className="px-8 py-3 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Save stock
          </button>
        </form>
      </section>
    </>
  );
}
