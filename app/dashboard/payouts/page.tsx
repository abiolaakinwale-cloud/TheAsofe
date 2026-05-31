import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/account";

export const metadata = { title: "Payouts" };

export default async function SellerPayoutsList() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard/payouts");
  const { data: profile } = await sb.from("profiles").select("role, brand").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) redirect("/dashboard");
  if (profile.role === "seller" && !profile.brand) redirect("/dashboard");

  // RLS filters to brand for sellers; admin sees all (we still scope by brand if profile.brand set)
  let q = sb.from("payouts").select("id, brand, status, period_start, period_end, gross_total, refund_total, net_amount, currency, paid_at, sent_at, created_at").order("created_at", { ascending: false });
  if (profile.brand) q = q.eq("brand", profile.brand);
  const { data: payouts } = await q;

  const totalPaid = (payouts ?? []).filter(p => p.status === "paid").reduce((s, p) => s + p.net_amount, 0);
  const totalPending = (payouts ?? []).filter(p => p.status === "draft" || p.status === "sent").reduce((s, p) => s + p.net_amount, 0);

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Dashboard</p>
      <h1 className="display text-4xl lg:text-5xl mb-10" style={{ color: "var(--color-ink)" }}>
        Payouts.
      </h1>

      <div className="grid sm:grid-cols-2 gap-px mb-12 max-w-2xl">
        <Stat k="Paid to date"     v={formatPrice(totalPaid)}    colour="var(--color-emerald)" />
        <Stat k="Pending / unpaid" v={formatPrice(totalPending)} colour="var(--color-saffron)" />
      </div>

      {!payouts || payouts.length === 0 ? (
        <p className="text-base leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
          No payouts issued yet. Your first statement will appear here once Asofe has processed orders containing your pieces over a settled period.
        </p>
      ) : (
        <ul className="space-y-px max-w-4xl">
          {payouts.map(p => (
            <li key={p.id}>
              <Link
                href={`/dashboard/payouts/${p.id}`}
                className="grid grid-cols-12 gap-4 items-baseline p-5 hover:bg-[var(--color-cream)] transition-colors"
                style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
              >
                <span className="col-span-6 lg:col-span-4 text-sm" style={{ color: "var(--color-ink)" }}>
                  {p.period_start} → {p.period_end}
                </span>
                <span className="hidden lg:inline lg:col-span-3 text-xs" style={{ color: "var(--color-muted)" }}>
                  {p.paid_at ? `Paid ${formatDate(p.paid_at)}` : p.sent_at ? `Sent ${formatDate(p.sent_at)}` : `Created ${formatDate(p.created_at)}`}
                </span>
                <span className="col-span-4 lg:col-span-3 text-sm text-right tabular-nums" style={{ color: "var(--color-ink)" }}>
                  {formatPrice(p.net_amount, p.currency)}
                </span>
                <span
                  className="col-span-2 lg:col-span-2 text-right text-[10px] tracking-[0.18em] uppercase"
                  style={{
                    color:
                      p.status === "paid"      ? "var(--color-emerald)" :
                      p.status === "cancelled" ? "var(--color-oxblood)" :
                      p.status === "sent"      ? "var(--color-saffron)" : "var(--color-muted)",
                  }}
                >
                  {p.status}
                </span>
              </Link>
            </li>
          ))}
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
