import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { addAddress, removeAddress } from "./actions";

export default async function AccountAddressesPage() {
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/signin?next=/account/addresses");

  const { data: addresses } = await sb
    .from("addresses")
    .select("id, full_name, line1, line2, city, postcode, country, phone, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <Link href="/account" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Overview
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Where pieces arrive</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>Addresses.</h1>

      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-x-16 gap-y-12 max-w-5xl">
        <div>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Saved</h2>
          {(addresses?.length ?? 0) === 0 ? (
            <p className="text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              No addresses on file. Add one to the right — Stripe Checkout will still ask for a shipping address, but a saved one speeds up future visits.
            </p>
          ) : (
            <ul className="space-y-6">
              {addresses!.map(a => (
                <li key={a.id} className="pb-6 border-b" style={{ borderColor: "var(--color-rule)" }}>
                  <div className="flex items-start justify-between gap-4">
                    <address className="not-italic text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>
                      <span className="block font-medium">{a.full_name}</span>
                      <span className="block">{a.line1}</span>
                      {a.line2 && <span className="block">{a.line2}</span>}
                      <span className="block">{a.city} {a.postcode}</span>
                      <span className="block">{a.country}</span>
                      {a.phone && <span className="block mt-1" style={{ color: "var(--color-muted)" }}>{a.phone}</span>}
                    </address>
                    <form action={removeAddress.bind(null, a.id)}>
                      <button type="submit" className="text-[10px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-oxblood)" }}>
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="eyebrow mb-6" style={{ color: "var(--color-emerald)" }}>Add an address</h2>
          <form action={addAddress} className="space-y-5">
            <Field name="full_name" label="Full name" />
            <Field name="line1"     label="Address line 1" />
            <Field name="line2"     label="Address line 2 (optional)" />
            <div className="grid grid-cols-2 gap-4">
              <Field name="city"     label="City" />
              <Field name="postcode" label="Postcode" />
            </div>
            <Field name="country" label="Country" defaultValue="United Kingdom" />
            <Field name="phone"   label="Phone (optional)" />
            <button type="submit" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
              Save address
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{label}</span>
      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="w-full bg-transparent border-b py-2 text-sm outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}
