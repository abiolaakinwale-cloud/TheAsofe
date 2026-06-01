import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const metadata = { title: "Wishlist insights" };

const SEVEN_DAYS_MS  = 7 * 86_400_000;
const THIRTY_DAYS_MS = 30 * 86_400_000;

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export default async function WishlistAnalyticsPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard/wishlists");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  const admin = getAdminSupabase();

  // 1. The seller's products — needed both for ownership filtering and to
  //    show pieces with zero wishes (otherwise they'd vanish from the list).
  let prodQ = admin.from("products").select("slug, name, brand, images, price, currency");
  if (profile.brand) prodQ = prodQ.eq("brand", profile.brand);
  const { data: products } = await prodQ;
  const productBySlug = new Map((products ?? []).map(p => [p.slug, p]));
  const ownedSlugs = (products ?? []).map(p => p.slug);

  // 2. All wishlist rows touching those products — strip user_id before it
  //    leaves the server so the seller can't see who wished what.
  const { data: wishRows } = ownedSlugs.length
    ? await admin
        .from("wishlist")
        .select("product_slug, created_at")
        .in("product_slug", ownedSlugs)
    : { data: [] };

  const now = Date.now();
  const totalCount       = wishRows?.length ?? 0;
  const last7dCount      = (wishRows ?? []).filter(r => now - new Date(r.created_at).getTime() <= SEVEN_DAYS_MS).length;
  const last30dCount     = (wishRows ?? []).filter(r => now - new Date(r.created_at).getTime() <= THIRTY_DAYS_MS).length;

  // 3. Per-piece aggregate
  type PieceStat = {
    slug: string;
    name: string;
    image: string | null;
    price: number;
    currency: string;
    total: number;
    last7d: number;
    last30d: number;
  };
  const byPiece = new Map<string, PieceStat>();
  for (const p of products ?? []) {
    byPiece.set(p.slug, {
      slug: p.slug,
      name: p.name,
      image: (p.images as string[] | null)?.[0] ?? null,
      price: p.price,
      currency: p.currency,
      total: 0,
      last7d: 0,
      last30d: 0,
    });
  }
  for (const w of wishRows ?? []) {
    const stat = byPiece.get(w.product_slug);
    if (!stat) continue;
    stat.total++;
    const age = now - new Date(w.created_at).getTime();
    if (age <= SEVEN_DAYS_MS)  stat.last7d++;
    if (age <= THIRTY_DAYS_MS) stat.last30d++;
  }
  const ranked = Array.from(byPiece.values())
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total || b.last7d - a.last7d);

  // 4. Recent additions timeline (anonymised — just piece + timestamp)
  const recent = (wishRows ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12);

  const topPiece = ranked[0];

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Insights</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        {totalCount} {totalCount === 1 ? "piece" : "pieces"} wishlisted across your collection.
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        Customers stay anonymous. These signals are the strongest pre-purchase indicator we have — pieces with high wishlist counts but low stock are at risk of selling out the moment a customer commits.
      </p>

      <div className="grid sm:grid-cols-3 gap-px mb-16 max-w-4xl">
        <Stat k="Total wishlists" v={String(totalCount)} colour="var(--color-emerald)" />
        <Stat k="Last 7 days"     v={`${last7dCount} added`} colour="var(--color-cobalt)" />
        <Stat k="Last 30 days"    v={`${last30dCount} added`} colour="var(--color-saffron)" />
      </div>

      {topPiece && (
        <div className="mb-16 p-8 max-w-4xl" style={{ backgroundColor: "var(--color-cream)" }}>
          <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Most loved</p>
          <h2 className="display text-2xl lg:text-3xl mb-3" style={{ color: "var(--color-ink)" }}>
            {topPiece.name}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {topPiece.total} {topPiece.total === 1 ? "wishlist" : "wishlists"} ·{" "}
            {topPiece.last7d > 0 ? `${topPiece.last7d} in the last week — momentum is real.` : "No new wishes this week."}
          </p>
        </div>
      )}

      <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>By piece</h2>
      {ranked.length === 0 ? (
        <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
          No wishlist activity yet. Once customers start saving your pieces you&apos;ll see the ranking here.
        </p>
      ) : (
        <ul className="space-y-px mb-16 max-w-5xl">
          <li className="hidden lg:grid grid-cols-12 gap-4 text-[10px] tracking-[0.22em] uppercase pb-2" style={{ color: "var(--color-muted)" }}>
            <span className="col-span-6">Piece</span>
            <span className="col-span-2 text-right">7-day</span>
            <span className="col-span-2 text-right">30-day</span>
            <span className="col-span-2 text-right">Total</span>
          </li>
          {ranked.map(p => (
            <li key={p.slug} className="grid grid-cols-12 gap-4 items-baseline p-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <Link href={`/products/${p.slug}`} className="col-span-12 lg:col-span-6 text-sm lux-link" style={{ color: "var(--color-ink)" }}>
                {p.name}
                <span className="block text-xs mt-1 font-mono" style={{ color: "var(--color-muted)" }}>{p.slug}</span>
              </Link>
              <span className="col-span-4 lg:col-span-2 text-right tabular-nums text-sm" style={{ color: p.last7d > 0 ? "var(--color-cobalt)" : "var(--color-muted)" }}>
                {p.last7d > 0 ? `+${p.last7d}` : "—"}
              </span>
              <span className="col-span-4 lg:col-span-2 text-right tabular-nums text-sm" style={{ color: p.last30d > 0 ? "var(--color-saffron)" : "var(--color-muted)" }}>
                {p.last30d > 0 ? `+${p.last30d}` : "—"}
              </span>
              <span className="col-span-4 lg:col-span-2 text-right tabular-nums text-base" style={{ color: "var(--color-ink)" }}>
                {p.total}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Recent activity</h2>
      {recent.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>Nothing yet.</p>
      ) : (
        <ul className="space-y-3 max-w-3xl">
          {recent.map((r, i) => {
            const p = productBySlug.get(r.product_slug);
            return (
              <li key={`${r.product_slug}-${r.created_at}-${i}`} className="flex items-baseline justify-between gap-4 py-2 border-b" style={{ borderColor: "var(--color-rule)" }}>
                <span className="text-sm" style={{ color: "var(--color-ink)" }}>
                  Someone wishlisted{" "}
                  <Link href={`/products/${r.product_slug}`} className="lux-link" style={{ color: "var(--color-ink)" }}>
                    {p?.name ?? r.product_slug}
                  </Link>
                </span>
                <span className="text-xs tabular-nums whitespace-nowrap" style={{ color: "var(--color-muted)" }}>
                  {fmtRelative(r.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Stat({ k, v, colour }: { k: string; v: string; colour: string }) {
  return (
    <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[10px] tracking-[0.18em] uppercase mb-3" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-3xl tabular-nums" style={{ color: colour }}>{v}</p>
    </div>
  );
}
