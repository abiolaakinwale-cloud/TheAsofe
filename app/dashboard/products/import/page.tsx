import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import ImportForm from "./ImportForm";

export default async function BulkImportPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard/products/import");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  return (
    <>
      <Link href="/dashboard/products" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Back to collection
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Bulk import</p>
      <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>
        Load your collection.
      </h1>
      <div className="max-w-3xl space-y-6 mb-12 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        <p>
          Upload a CSV (or paste one in) to add many pieces at once. We&apos;ll validate every row and insert what passes —
          rows with problems are returned with a reason so you can fix and re-import only those.
        </p>
        <p>
          Image URLs must already exist on the web — upload images via the single-product form first if you need somewhere
          to host them, or paste links to your own image hosting.
        </p>
        <details className="pt-2">
          <summary className="cursor-pointer text-xs tracking-[0.14em] uppercase" style={{ color: "var(--color-ink)" }}>Column reference</summary>
          <div className="mt-4 grid sm:grid-cols-2 gap-x-10 gap-y-3 text-xs">
            <Col k="slug"        v="lowercase, letters/numbers/hyphens, unique" />
            <Col k="name"        v="display name" />
            <Col k="category"    v="womenswear · menswear · bags · shoes · jewellery" />
            <Col k="subcategory" v="optional · free text" />
            <Col k="price"       v="GBP integer, no decimals" />
            <Col k="colour"      v="short colour label" />
            <Col k="made_in"     v="country" />
            <Col k="description" v="paragraph; wrap in quotes if it has commas" />
            <Col k="sizes"       v="separate with , ; or | (e.g. &quot;XS,S,M,L&quot;)" />
            <Col k="composition" v="separate with , (e.g. &quot;100% aso oke cotton&quot;)" />
            <Col k="images"      v="URLs separated by | or whitespace" />
            <Col k="published"   v="true / false (default false)" />
            <Col k="new_arrival" v="true / false (default false)" />
            <Col k="featured"    v="true / false (default false)" />
          </div>
        </details>
      </div>

      <ImportForm />
    </>
  );
}

function Col({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono w-24 flex-shrink-0" style={{ color: "var(--color-ink)" }}>{k}</span>
      <span style={{ color: "var(--color-ink-soft)" }} dangerouslySetInnerHTML={{ __html: v }} />
    </div>
  );
}
