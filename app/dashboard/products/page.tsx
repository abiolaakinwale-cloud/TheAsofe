import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/data";
import { deleteProduct } from "./actions";

export default async function DashboardProductsPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard/products");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  const admin = getAdminSupabase();
  const query = admin.from("products")
    .select("slug, name, price, colour, published, new_arrival, featured, category")
    .order("name");
  const { data: products } = profile.brand
    ? await query.eq("brand", profile.brand)
    : await query;

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
        <div>
          <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>The Collection</p>
          <h1 className="display text-4xl lg:text-5xl" style={{ color: "var(--color-ink)" }}>
            {products?.length ?? 0} pieces.
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/products/import" className="px-7 py-3.5 text-[12px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}>
            Bulk import
          </Link>
          <Link href="/dashboard/products/new" className="px-7 py-3.5 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Add new piece
          </Link>
        </div>
      </div>

      {(products ?? []).length === 0 ? (
        <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>No pieces yet. Add your first.</p>
      ) : (
        <ul className="space-y-px">
          {products!.map(p => (
            <li key={p.slug} className="p-6 grid grid-cols-12 items-center gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="col-span-12 lg:col-span-5">
                <Link href={`/dashboard/products/${p.slug}/edit`} className="serif text-xl lux-link" style={{ color: "var(--color-ink)" }}>
                  {p.name}
                </Link>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{p.slug}</p>
              </div>
              <p className="col-span-4 lg:col-span-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>{p.category}</p>
              <p className="col-span-4 lg:col-span-2 text-sm tabular-nums" style={{ color: "var(--color-ink-soft)" }}>{formatPrice(p.price)}</p>
              <div className="col-span-4 lg:col-span-2 flex items-center gap-2 flex-wrap">
                {p.published   && <Pill colour="var(--color-emerald)"      label="Live" />}
                {!p.published  && <Pill colour="var(--color-muted)"        label="Draft" />}
                {p.new_arrival && <Pill colour="var(--color-saffron)"      label="New" />}
                {p.featured    && <Pill colour="var(--color-oxblood)"      label="Featured" />}
              </div>
              <div className="col-span-12 lg:col-span-1 flex justify-end">
                <form action={deleteProduct.bind(null, p.slug)}>
                  <button type="submit" className="text-[10px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Pill({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase" style={{ color: colour }}>
      <span className="inline-block w-1.5 h-1.5" style={{ backgroundColor: colour }} />
      {label}
    </span>
  );
}
