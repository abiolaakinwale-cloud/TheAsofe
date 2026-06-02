import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { formatPrice, formatDate, ORDER_STATUS_LABEL } from "@/lib/account";

const SETTLED = new Set(["paid", "packed", "dispatched", "delivered"]);
const REFUNDISH = new Set(["refunded", "cancelled"]);

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getAdminSupabase();

  const { data: profile } = await sb
    .from("profiles")
    .select("id, email, role, brand, referral_code, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const [
    { data: orders },
    { data: wishlist },
    { data: returns },
    { data: reviews },
    { data: questions },
    { data: referralsSent },
    { data: referralReceived },
    { data: addresses },
    { data: shares },
  ] = await Promise.all([
    sb.from("orders")
      .select("id, status, subtotal, shipping, total, currency, created_at, paid_at, delivered_at, order_items(brand_slug, name, qty)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    sb.from("wishlist").select("product_slug, created_at").eq("user_id", id),
    sb.from("returns").select("id, status, rma_number, refund_amount, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    sb.from("reviews").select("id, rating, product_slug, created_at").eq("customer_id", id),
    sb.from("designer_questions").select("id, product_slug, status, created_at").eq("customer_id", id),
    sb.from("referrals").select("id, status, referee_email, reward_amount_pence, created_at").eq("referrer_user_id", id),
    sb.from("referrals").select("id, status, code, rewarded_at").eq("referee_user_id", id).maybeSingle(),
    sb.from("addresses").select("id, full_name, line1, city, postcode, country, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(5),
    sb.from("wishlist_shares").select("token, is_active").eq("user_id", id).maybeSingle(),
  ]);

  type Item = { brand_slug: string; name: string; qty: number };
  type Order = {
    id: string; status: string; subtotal: number; shipping: number; total: number; currency: string;
    created_at: string; paid_at: string | null; delivered_at: string | null;
    order_items: Item[];
  };
  const allOrders = (orders ?? []) as Order[];

  // Headline aggregates
  const settledOrders = allOrders.filter(o => SETTLED.has(o.status));
  const refundOrders  = allOrders.filter(o => REFUNDISH.has(o.status));
  const ltv           = settledOrders.reduce((s, o) => s + o.total, 0);
  const refundedSum   = refundOrders.reduce((s, o) => s + o.total, 0);
  const aov           = settledOrders.length > 0 ? Math.round(ltv / settledOrders.length) : 0;
  const firstOrder    = allOrders.length > 0 ? allOrders[allOrders.length - 1] : null;
  const lastOrder     = allOrders.length > 0 ? allOrders[0] : null;

  // Brand spend breakdown — sum order_item qty × estimated avg (we don't have unit_price selected here, so use order.subtotal split proportionally)
  const brandTouches = new Map<string, { items: number; orders: Set<string> }>();
  for (const o of settledOrders) {
    for (const it of o.order_items ?? []) {
      const cur = brandTouches.get(it.brand_slug) ?? { items: 0, orders: new Set() };
      cur.items += it.qty;
      cur.orders.add(o.id);
      brandTouches.set(it.brand_slug, cur);
    }
  }
  const brandsRanked = Array.from(brandTouches.entries())
    .map(([brand, v]) => ({ brand, items: v.items, orders: v.orders.size }))
    .sort((a, b) => b.items - a.items)
    .slice(0, 5);

  const currency = settledOrders[0]?.currency ?? "GBP";
  type ReferralReceived = { id: string; status: string; code: string; rewarded_at: string | null } | null;
  const refReceived = referralReceived as unknown as ReferralReceived;

  return (
    <>
      <Link href="/admin/users" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← All users
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Customer</p>
      <h1 className="display text-3xl lg:text-4xl mb-3" style={{ color: "var(--color-ink)" }}>
        {profile.email}
      </h1>
      <p className="text-sm mb-12" style={{ color: "var(--color-muted)" }}>
        {profile.role}
        {profile.brand && ` · ${profile.brand}`}
        {" · "}joined {formatDate(profile.created_at)}
        {profile.referral_code && <> · referral code <span className="font-mono" style={{ color: "var(--color-ink)" }}>{profile.referral_code}</span></>}
      </p>

      {/* ─── Headline ─────────────────────────────────────── */}
      <section className="grid sm:grid-cols-4 gap-px mb-16 max-w-5xl">
        <Stat k="Lifetime spend"  v={formatPrice(ltv, currency)}          colour="var(--color-emerald)" />
        <Stat k="Orders settled"  v={String(settledOrders.length)}          colour="var(--color-cobalt)" />
        <Stat k="Average order"   v={settledOrders.length > 0 ? formatPrice(aov, currency) : "—"} colour="var(--color-saffron)" />
        <Stat k="Refunds / cancels" v={refundOrders.length === 0 ? "—" : `${refundOrders.length} · ${formatPrice(refundedSum, currency)}`} colour="var(--color-oxblood)" />
      </section>

      <section className="grid lg:grid-cols-[2fr_1fr] gap-12 max-w-6xl">
        <div>
          {/* Orders list */}
          <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Orders ({allOrders.length})</h2>
          {allOrders.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>No orders placed yet.</p>
          ) : (
            <ul className="space-y-px mb-12">
              {allOrders.slice(0, 20).map(o => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="grid grid-cols-12 gap-4 items-baseline p-4 hover:bg-[var(--color-cream)] transition-colors"
                    style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
                  >
                    <span className="col-span-3 lg:col-span-2 font-mono text-xs" style={{ color: "var(--color-ink)" }}>{o.id.slice(0, 8)}</span>
                    <span className="col-span-4 lg:col-span-3 text-xs" style={{ color: "var(--color-muted)" }}>{formatDate(o.created_at)}</span>
                    <span className="col-span-2 lg:col-span-3 text-xs" style={{ color: "var(--color-muted)" }}>
                      {ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL] ?? o.status}
                    </span>
                    <span className="col-span-2 lg:col-span-2 text-xs text-right" style={{ color: "var(--color-muted)" }}>
                      {o.order_items?.reduce((s, i) => s + i.qty, 0) ?? 0} pcs
                    </span>
                    <span className="col-span-3 lg:col-span-2 text-sm text-right tabular-nums" style={{ color: "var(--color-ink)" }}>
                      {formatPrice(o.total, o.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Designer affinity */}
          {brandsRanked.length > 0 && (
            <>
              <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Designer affinity</h2>
              <ul className="space-y-3 mb-12 max-w-md">
                {brandsRanked.map(b => (
                  <li key={b.brand} className="flex items-baseline justify-between border-b pb-2" style={{ borderColor: "var(--color-rule)" }}>
                    <span className="text-sm capitalize" style={{ color: "var(--color-ink)" }}>{b.brand.replace(/-/g, " ")}</span>
                    <span className="text-xs tabular-nums" style={{ color: "var(--color-muted)" }}>
                      {b.items} pieces · {b.orders} {b.orders === 1 ? "order" : "orders"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Engagement */}
          <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Engagement</h2>
          <ul className="grid sm:grid-cols-2 gap-y-3 gap-x-8 text-sm max-w-2xl">
            <Engagement k="Wishlist saves"   v={String(wishlist?.length ?? 0)} />
            <Engagement k="Reviews left"     v={String(reviews?.length ?? 0)} />
            <Engagement k="Questions asked"  v={String(questions?.length ?? 0)} />
            <Engagement k="Returns filed"    v={String(returns?.length ?? 0)} />
            <Engagement k="Addresses on file" v={String(addresses?.length ?? 0)} />
            <Engagement k="Wishlist shared"   v={shares?.is_active ? "Yes" : "No"} />
          </ul>
        </div>

        <aside>
          <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Particulars</h2>
          <dl className="space-y-3 text-sm mb-10">
            <Row k="First order"   v={firstOrder ? formatDate(firstOrder.created_at) : "—"} />
            <Row k="Most recent"   v={lastOrder ? formatDate(lastOrder.created_at) : "—"} />
            <Row k="Referral code" v={profile.referral_code ?? "—"} mono />
            {refReceived && <Row k="Referred by" v={refReceived.code} mono />}
          </dl>

          {(referralsSent ?? []).length > 0 && (
            <>
              <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Referrals sent ({referralsSent!.length})</h2>
              <ul className="space-y-3 text-xs mb-10">
                {referralsSent!.map(r => (
                  <li key={r.id} className="flex items-baseline justify-between gap-3 border-b pb-2" style={{ borderColor: "var(--color-rule)" }}>
                    <span style={{ color: "var(--color-ink)" }}>{r.referee_email ?? "Anonymous"}</span>
                    <span style={{ color: r.status === "rewarded" ? "var(--color-emerald)" : "var(--color-muted)" }}>{r.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {(returns ?? []).length > 0 && (
            <>
              <h2 className="eyebrow mb-5" style={{ color: "var(--color-emerald)" }}>Returns ({returns!.length})</h2>
              <ul className="space-y-3 text-xs">
                {returns!.map(r => (
                  <li key={r.id} className="flex items-baseline justify-between gap-3 border-b pb-2" style={{ borderColor: "var(--color-rule)" }}>
                    <Link href={`/admin/returns/${r.id}`} className="lux-link font-mono" style={{ color: "var(--color-ink)" }}>
                      {r.rma_number}
                    </Link>
                    <span style={{ color: "var(--color-muted)" }}>{r.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </section>
    </>
  );
}

function Stat({ k, v, colour }: { k: string; v: string; colour: string }) {
  return (
    <div className="p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[10px] tracking-[0.18em] uppercase mb-3" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-2xl lg:text-3xl tabular-nums" style={{ color: colour }}>{v}</p>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</dt>
      <dd className={mono ? "font-mono text-xs" : "text-sm tabular-nums"} style={{ color: "var(--color-ink)" }}>{v}</dd>
    </div>
  );
}

function Engagement({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b pb-2" style={{ borderColor: "var(--color-rule)" }}>
      <span className="text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{k}</span>
      <span className="tabular-nums" style={{ color: "var(--color-ink)" }}>{v}</span>
    </div>
  );
}
