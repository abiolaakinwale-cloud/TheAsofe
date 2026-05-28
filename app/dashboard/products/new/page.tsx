import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries";
import { createProduct } from "../actions";
import ProductFields from "../_components/ProductFields";

export default async function NewProductPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard/products/new");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (profile?.role !== "seller" || !profile.brand) redirect("/dashboard");

  const categories = await getCategories();

  return (
    <>
      <Link href="/dashboard/products" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Back to collection
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Add a piece</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>New piece.</h1>

      <form action={createProduct} className="space-y-8 max-w-4xl">
        <ProductFields categories={categories} brand={profile.brand} />
        <div className="pt-4">
          <button type="submit" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Add to collection
          </button>
        </div>
      </form>
    </>
  );
}
