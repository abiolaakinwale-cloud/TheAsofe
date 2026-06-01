import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { signOut } from "@/app/signin/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/brand-signin?next=/dashboard");

  const { data: profile } = await sb
    .from("profiles")
    .select("role, brand, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div style={{ backgroundColor: "var(--color-ground)", minHeight: "70vh" }}>
      <div className="border-b" style={{ borderColor: "var(--color-rule)" }}>
        <div className="max-w-[88rem] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-8 lg:gap-10 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
            <span style={{ color: "var(--color-muted)" }}>Asofe · Atelier</span>
            <Link href="/dashboard" className="lux-link">Overview</Link>
            <Link href="/dashboard/products" className="lux-link">Products</Link>
            <Link href="/dashboard/inventory" className="lux-link">Inventory</Link>
            <Link href="/dashboard/orders" className="lux-link">Orders</Link>
            <Link href="/dashboard/questions" className="lux-link">Questions</Link>
            <Link href="/dashboard/shipments" className="lux-link">Shipments</Link>
            <Link href="/dashboard/payouts" className="lux-link">Payouts</Link>
            <Link href="/dashboard/analytics" className="lux-link">Analytics</Link>
            {profile?.role === "admin" && (
              <Link href="/admin" className="lux-link" style={{ color: "var(--color-oxblood)" }}>Admin</Link>
            )}
          </div>
          <form action={signOut}>
            <button type="submit" className="text-[11px] tracking-[0.18em] uppercase font-medium lux-link" style={{ color: "var(--color-muted)" }}>
              {profile?.email} · Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-[88rem] mx-auto px-6 lg:px-12 py-12 lg:py-16">
        {children}
      </div>
    </div>
  );
}
