import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import ImportStockForm from "./ImportStockForm";

export default async function BulkStockImportPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard/products/import-stock");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  return (
    <>
      <Link href="/dashboard/products" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Back to collection
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Bulk stock update</p>
      <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>
        Refresh your stock.
      </h1>
      <div className="max-w-3xl space-y-6 mb-12 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        <p>
          Upload a CSV (or paste one in) to update the stock level on many (product, size) pairs at once. This path
          only touches stock — it doesn&apos;t add or edit products. Use{" "}
          <Link href="/dashboard/products/import" className="lux-link" style={{ color: "var(--color-ink)" }}>Bulk import</Link>{" "}
          if you&apos;re adding new pieces.
        </p>
        <p>
          Each row replaces the stock count for that (slug, size). Sizes must already exist on the product — if you
          need a new size, edit the product first.
        </p>
        <details className="pt-2">
          <summary className="cursor-pointer text-xs tracking-[0.14em] uppercase" style={{ color: "var(--color-ink)" }}>Column reference</summary>
          <div className="mt-4 grid sm:grid-cols-2 gap-x-10 gap-y-3 text-xs">
            <Col k="slug"     v="Existing product slug from your collection" />
            <Col k="size"     v="One of the sizes defined on the product" />
            <Col k="quantity" v="Non-negative integer (0 = sold out)" />
          </div>
        </details>
      </div>

      <ImportStockForm />
    </>
  );
}

function Col({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono w-24 flex-shrink-0" style={{ color: "var(--color-ink)" }}>{k}</span>
      <span style={{ color: "var(--color-ink-soft)" }}>{v}</span>
    </div>
  );
}
