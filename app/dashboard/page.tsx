import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function DashboardOverview() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard");

  const { data: profile } = await sb
    .from("profiles")
    .select("role, brand")
    .eq("id", user.id)
    .maybeSingle();

  // Visitors haven't been promoted yet; check for an application so we can
  // tell them what's happening.
  if (!profile || profile.role === "visitor") {
    const { data: app } = await sb
      .from("applications")
      .select("status, created_at, brand_name")
      .eq("applicant_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return <Waiting status={app?.status ?? null} brandName={app?.brand_name ?? null} />;
  }

  // Sellers without an assigned brand also wait.
  if (profile.role === "seller" && !profile.brand) {
    return <Waiting status="approved" brandName={null} />;
  }

  // Sellers see their brand summary; admins see a link to the admin floor.
  if (profile.role === "seller") {
    const [{ data: brand }, products] = await Promise.all([
      sb.from("brands").select("slug, name, tagline, origin, story").eq("slug", profile.brand!).maybeSingle(),
      sb.from("products").select("slug, name, published").eq("brand", profile.brand!),
    ]);
    const productList = products.data ?? [];
    const total = productList.length;
    const published = productList.filter(p => p.published).length;
    const productNameBySlug = new Map(productList.map(p => [p.slug, p.name]));
    const slugs = productList.map(p => p.slug);

    // Low-stock pieces — every (product, size) with qty ≤ LOW_STOCK_THRESHOLD.
    // Same threshold the Stripe webhook uses for the low-stock email alert.
    const LOW_STOCK_THRESHOLD = 3;
    const { data: lowStockRows } = slugs.length
      ? await sb
          .from("stock_levels")
          .select("product_slug, size, quantity")
          .in("product_slug", slugs)
          .lte("quantity", LOW_STOCK_THRESHOLD)
          .order("quantity", { ascending: true })
      : { data: [] };
    const lowStock = (lowStockRows ?? []).map(r => ({
      ...r,
      name: productNameBySlug.get(r.product_slug) ?? r.product_slug,
    }));

    return (
      <>
        <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Your house</p>
        <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>{brand?.name}</h1>
        <p className="serif text-xl italic mb-12 max-w-xl" style={{ color: "var(--color-ink-soft)" }}>{brand?.tagline}</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px mb-12">
          <Stat k="Total pieces" v={total} />
          <Stat k="Published"    v={published} />
          <Stat k="Unpublished"  v={total - published} />
          <Stat k="Running low"  v={lowStock.length} accent={lowStock.length > 0 ? "var(--color-oxblood)" : undefined} />
        </div>

        {lowStock.length > 0 && (
          <section className="mb-12 p-8 lg:p-10 border" style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-cream)" }}>
            <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
              <div>
                <p className="eyebrow mb-2" style={{ color: "var(--color-oxblood)" }}>Running low</p>
                <h2 className="display text-2xl lg:text-3xl" style={{ color: "var(--color-ink)" }}>
                  {lowStock.length} {lowStock.length === 1 ? "size" : "sizes"} at or below {LOW_STOCK_THRESHOLD} in stock.
                </h2>
              </div>
              <Link
                href="/dashboard/products/import-stock"
                className="px-6 py-3 text-[11px] tracking-[0.22em] uppercase font-medium"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
              >
                Bulk stock update →
              </Link>
            </div>
            <ul className="space-y-px">
              {lowStock.map(s => (
                <li
                  key={`${s.product_slug}-${s.size}`}
                  className="p-4 grid grid-cols-12 items-center gap-4 text-sm"
                  style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)", backgroundColor: "var(--color-ground)" }}
                >
                  <Link
                    href={`/dashboard/products/${s.product_slug}/edit`}
                    className="col-span-12 sm:col-span-7 lux-link truncate"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {s.name}
                  </Link>
                  <span className="col-span-6 sm:col-span-2 text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-ink-soft)" }}>
                    Size {s.size}
                  </span>
                  <span
                    className="col-span-6 sm:col-span-3 text-right tabular-nums text-[12px] tracking-[0.18em] uppercase font-medium"
                    style={{ color: s.quantity === 0 ? "var(--color-oxblood)" : "var(--color-ink)" }}
                  >
                    {s.quantity === 0 ? "Sold out" : `Qty ${s.quantity}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link href="/dashboard/products" className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
          Manage the collection →
        </Link>
      </>
    );
  }

  // Admin landed on /dashboard
  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Signed in</p>
      <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>You're an admin.</h1>
      <p className="text-base mb-10 max-w-md" style={{ color: "var(--color-ink-soft)" }}>
        The seller dashboard is empty for admin accounts. The operations floor is over here:
      </p>
      <Link href="/admin" className="inline-block px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
        Open admin →
      </Link>
    </>
  );
}

function Stat({ k, v, accent }: { k: string; v: number; accent?: string }) {
  return (
    <div className="p-8" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[11px] tracking-[0.18em] uppercase mb-4" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-4xl tabular-nums" style={{ color: accent ?? "var(--color-ink)" }}>{v}</p>
    </div>
  );
}

function Waiting({ status, brandName }: { status: string | null; brandName: string | null }) {
  if (status === "pending") {
    return (
      <>
        <p className="eyebrow mb-4" style={{ color: "var(--color-saffron)" }}>Application under review</p>
        <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>
          Thank you{brandName ? `, ${brandName}` : ""}.
        </h1>
        <p className="text-base lg:text-lg leading-relaxed max-w-xl mb-6" style={{ color: "var(--color-ink-soft)" }}>
          Your application is with our curation team. We reply to every application personally — expect a note
          on WhatsApp within five working days. When you&apos;re approved, this page will become your atelier.
        </p>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Questions in the meantime? Write to{" "}
          <a href="mailto:correspondence@theasofe.com" className="lux-link" style={{ color: "var(--color-ink)" }}>correspondence@theasofe.com</a>.
        </p>
      </>
    );
  }

  if (status === "rejected") {
    return (
      <>
        <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Application status</p>
        <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>
          A note from the curation team.
        </h1>
        <p className="text-base lg:text-lg leading-relaxed max-w-xl mb-6" style={{ color: "var(--color-ink-soft)" }}>
          We weren&apos;t able to take your house on the floor at this time. Our roster is small and curated;
          most of the brands we receive are remarkable. If your work develops or you&apos;d like a second look in
          future, we&apos;d be glad to hear from you again.
        </p>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Reach the curation team at{" "}
          <a href="mailto:correspondence@theasofe.com" className="lux-link" style={{ color: "var(--color-ink)" }}>correspondence@theasofe.com</a>.
        </p>
      </>
    );
  }

  // Approved but no brand assigned yet, OR no application on file (signed up
  // separately as a customer-style visitor).
  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-saffron)" }}>Almost there</p>
      <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>You&apos;re in.</h1>
      <p className="text-base lg:text-lg leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
        Your account is signed in. Once a member of the Asofe team finishes setting up your brand profile,
        you&apos;ll be able to manage your collection from here. We&apos;ll be in touch on WhatsApp.
      </p>
    </>
  );
}
