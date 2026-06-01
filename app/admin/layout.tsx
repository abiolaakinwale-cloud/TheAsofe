import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { signOut } from "@/app/signin/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defence-in-depth: middleware also enforces this, but a server-side check
  // here means a broken middleware can't accidentally expose admin pages.
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/admin-signin?next=/admin");
  const { data: profile } = await sb.from("profiles").select("role, email").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div style={{ backgroundColor: "var(--color-ground)", minHeight: "70vh" }}>
      <div className="border-b" style={{ borderColor: "var(--color-rule)" }}>
        <div className="max-w-[88rem] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-8 lg:gap-10 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
            <span style={{ color: "var(--color-muted)" }}>Asofe · Admin</span>
            <Link href="/admin" className="lux-link">Overview</Link>
            <Link href="/admin/orders" className="lux-link">Orders</Link>
            <Link href="/admin/returns" className="lux-link">Returns</Link>
            <Link href="/admin/reviews" className="lux-link">Reviews</Link>
            <Link href="/admin/payouts" className="lux-link">Payouts</Link>
            <Link href="/admin/shipments" className="lux-link">Shipments</Link>
            <Link href="/admin/applications" className="lux-link">Applications</Link>
            <Link href="/admin/brands" className="lux-link">Brands</Link>
            <Link href="/admin/users" className="lux-link">Users</Link>
            <Link href="/admin/cms" className="lux-link">CMS</Link>
            <Link href="/admin/journal" className="lux-link">Journal</Link>
            <Link href="/admin/audit" className="lux-link">Activity</Link>
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
