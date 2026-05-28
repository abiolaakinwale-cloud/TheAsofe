import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function DashboardOverview() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/dashboard");

  const { data: profile } = await sb
    .from("profiles")
    .select("role, brand")
    .eq("id", user.id)
    .maybeSingle();

  // Visitors haven't been promoted yet; show a holding page.
  if (!profile || profile.role === "visitor") {
    return <Waiting />;
  }

  // Sellers without an assigned brand also wait.
  if (profile.role === "seller" && !profile.brand) {
    return <Waiting />;
  }

  // Sellers see their brand summary; admins see a link to the admin floor.
  if (profile.role === "seller") {
    const [{ data: brand }, products] = await Promise.all([
      sb.from("brands").select("slug, name, tagline, origin, story").eq("slug", profile.brand!).maybeSingle(),
      sb.from("products").select("slug, name, price, published", { count: "exact" }).eq("brand", profile.brand!),
    ]);
    const total = products.data?.length ?? 0;
    const published = (products.data ?? []).filter(p => p.published).length;

    return (
      <>
        <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Your house</p>
        <h1 className="display text-4xl lg:text-5xl mb-3" style={{ color: "var(--color-ink)" }}>{brand?.name}</h1>
        <p className="serif text-xl italic mb-12 max-w-xl" style={{ color: "var(--color-ink-soft)" }}>{brand?.tagline}</p>

        <div className="grid sm:grid-cols-3 gap-px mb-12">
          <Stat k="Total pieces"     v={total} />
          <Stat k="Published"        v={published} />
          <Stat k="Unpublished"      v={total - published} />
        </div>

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

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="p-8" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[11px] tracking-[0.18em] uppercase mb-4" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-4xl tabular-nums" style={{ color: "var(--color-ink)" }}>{v}</p>
    </div>
  );
}

function Waiting() {
  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-saffron)" }}>Awaiting your house</p>
      <h1 className="display text-4xl lg:text-5xl mb-6" style={{ color: "var(--color-ink)" }}>You're in.</h1>
      <p className="text-base lg:text-lg leading-relaxed max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
        Your account is signed in. Once a member of the Asofe team assigns your brand,
        you'll be able to manage your collection from here. We'll be in touch on WhatsApp.
      </p>
    </>
  );
}
