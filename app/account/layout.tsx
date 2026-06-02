import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { signOut } from "@/app/signin/actions";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account");

  return (
    <div style={{ backgroundColor: "var(--color-ground)", minHeight: "70vh" }}>
      <div className="border-b" style={{ borderColor: "var(--color-rule)" }}>
        <div className="max-w-[88rem] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-8 lg:gap-10 text-[11px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
            <span style={{ color: "var(--color-muted)" }}>Asofe · Account</span>
            <Link href="/account" className="lux-link">Overview</Link>
            <Link href="/account/orders" className="lux-link">Orders</Link>
            <Link href="/account/returns" className="lux-link">Returns</Link>
            <Link href="/account/wishlist" className="lux-link">Wishlist</Link>
            <Link href="/account/referrals" className="lux-link">Referrals</Link>
            <Link href="/account/concierge" className="lux-link">Concierge</Link>
            <Link href="/account/addresses" className="lux-link">Addresses</Link>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-[11px] tracking-[0.18em] uppercase font-medium lux-link" style={{ color: "var(--color-muted)" }}>
              {user.email} · Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-[88rem] mx-auto px-6 lg:px-12 py-12 lg:py-16">{children}</div>
    </div>
  );
}
