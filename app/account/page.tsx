import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatPrice, formatDate, ORDER_STATUS_LABEL } from "@/lib/account";

export default async function AccountOverview() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account");

  // Recent orders (most recent 5) — RLS limits to this customer's rows.
  const { data: recent } = await sb
    .from("orders")
    .select("id, created_at, status, total, currency")
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: total } = await sb
    .from("orders")
    .select("id", { count: "exact", head: true });

  const openCount = (recent ?? []).filter(o => ["paid", "packed", "dispatched"].includes(o.status)).length;

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>The House</p>
      <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>
        Welcome back.
      </h1>
      <p className="serif text-xl italic mb-12 max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
        {user.email}
      </p>

      <div className="grid sm:grid-cols-3 gap-px mb-16">
        <Stat k="Total orders" v={total ?? 0} />
        <Stat k="In progress"  v={openCount} />
        <Stat k="Member since" v={user.created_at ? formatDate(user.created_at) : "—"} />
      </div>

      <section className="max-w-4xl">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="display text-2xl lg:text-3xl" style={{ color: "var(--color-ink)" }}>Recent orders</h2>
          {(recent?.length ?? 0) > 0 && (
            <Link href="/account/orders" className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
              All orders →
            </Link>
          )}
        </div>

        {(recent?.length ?? 0) === 0 ? (
          <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
            Your future orders will live here. When you place one, you'll be able to track every step from atelier to doorstep.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
            {recent!.map(o => (
              <li key={o.id} className="py-5 flex items-center justify-between gap-6 border-t" style={{ borderColor: "var(--color-rule)" }}>
                <div>
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="text-sm tracking-[0.14em] uppercase lux-link"
                    style={{ color: "var(--color-ink)" }}
                  >
                    Order {o.id.slice(0, 8)}
                  </Link>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                    {formatDate(o.created_at)} · {ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL] ?? o.status}
                  </p>
                </div>
                <p className="text-sm tabular-nums" style={{ color: "var(--color-ink)" }}>
                  {formatPrice(o.total, o.currency)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="p-8" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[11px] tracking-[0.18em] uppercase mb-4" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-4xl tabular-nums" style={{ color: "var(--color-ink)" }}>{v}</p>
    </div>
  );
}
