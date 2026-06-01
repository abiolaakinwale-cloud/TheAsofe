import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { submitReviewForm } from "./actions";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ product?: string; error?: string }>;
}) {
  const { id } = await params;
  const { product, error } = await searchParams;

  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signin?next=/account/orders/${id}/review?product=${product ?? ""}`);

  if (!product) notFound();

  const { data: order } = await sb
    .from("orders")
    .select("id, status, customer_id")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.customer_id !== user.id) notFound();
  if (order.status !== "delivered") {
    redirect(`/account/orders/${id}?error=${encodeURIComponent("Reviews open once your order is delivered.")}`);
  }

  const admin = getAdminSupabase();
  const { data: item } = await admin
    .from("order_items")
    .select("id, name, colour, size, brand_slug")
    .eq("order_id", id)
    .eq("product_slug", product)
    .maybeSingle();
  if (!item) notFound();

  // Pre-existing review?
  const { data: existing } = await sb
    .from("reviews")
    .select("id, rating, title, body, customer_name")
    .eq("customer_id", user.id)
    .eq("product_slug", product)
    .eq("order_id", id)
    .maybeSingle();
  if (existing) {
    redirect(`/account/orders/${id}?reviewed=${product}`);
  }

  return (
    <>
      <Link href={`/account/orders/${id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Order {id.slice(0, 8)}
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Review</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        {item.name}.
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-ink-soft)" }}>
        {item.brand_slug.replace(/-/g, " ")}
        {item.colour ? ` · ${item.colour}` : ""} · Size {item.size}
      </p>

      <form action={submitReviewForm} className="space-y-8 max-w-2xl">
        <input type="hidden" name="orderId" value={id} />
        <input type="hidden" name="productSlug" value={product} />

        {error && (
          <p className="p-4 text-sm" style={{ color: "var(--color-oxblood)", backgroundColor: "var(--color-cream)" }}>
            {decodeURIComponent(error)}
          </p>
        )}

        <fieldset>
          <legend className="eyebrow mb-4" style={{ color: "var(--color-emerald)" }}>Your rating</legend>
          <div className="flex items-center gap-4 flex-wrap">
            {[1, 2, 3, 4, 5].map(n => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name="rating" value={n} required className="peer sr-only" defaultChecked={n === 5} />
                <span className="block px-5 py-3 border text-base tabular-nums peer-checked:bg-[var(--color-ink)] peer-checked:text-[var(--color-ground)] transition-colors"
                  style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
                  {n} ★
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="block mb-3 eyebrow" style={{ color: "var(--color-emerald)" }}>Headline (optional)</span>
          <input
            name="title"
            maxLength={120}
            placeholder="A line that captures the piece"
            className="w-full h-12 border bg-transparent px-3 text-base"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        </label>

        <label className="block">
          <span className="block mb-3 eyebrow" style={{ color: "var(--color-emerald)" }}>Your thoughts (optional)</span>
          <textarea
            name="body"
            rows={6}
            maxLength={2000}
            placeholder="Fit, fabric, what stood out. As detailed or short as you like."
            className="w-full border bg-transparent p-3 text-base leading-relaxed"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        </label>

        <label className="block">
          <span className="block mb-3 eyebrow" style={{ color: "var(--color-emerald)" }}>Display name</span>
          <input
            name="displayName"
            maxLength={60}
            defaultValue={user.email?.split("@")[0] ?? ""}
            className="w-full h-12 border bg-transparent px-3 text-base"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
          <span className="block mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
            Shown publicly with your review. Use a first name or alias if you prefer.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button
            type="submit"
            className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Publish review
          </button>
          <Link href={`/account/orders/${id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
