import { getAdminSupabase } from "@/lib/supabase/admin";
import { updateProfile } from "./actions";

export default async function AdminUsersPage() {
  const sb = getAdminSupabase();
  const [{ data: profiles }, { data: brands }] = await Promise.all([
    sb.from("profiles").select("id, email, role, brand, created_at").order("created_at", { ascending: false }),
    sb.from("brands").select("slug, name").order("name"),
  ]);

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>Accounts</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {profiles?.length ?? 0} signed-in users.
      </h1>

      {(profiles ?? []).length === 0 ? (
        <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>
          No-one has signed in yet. Once an applicant signs in, they'll appear here ready to be promoted.
        </p>
      ) : (
        <ul className="space-y-px">
          {profiles!.map(p => (
            <li key={p.id} className="p-6 lg:p-8 grid lg:grid-cols-12 items-center gap-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="lg:col-span-5">
                <p className="serif text-lg" style={{ color: "var(--color-ink)" }}>{p.email}</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{new Date(p.created_at).toLocaleString()}</p>
              </div>
              <form action={updateProfile.bind(null, p.id)} className="lg:col-span-7 grid grid-cols-12 items-end gap-3">
                <label className="col-span-4 block">
                  <span className="block mb-1 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Role</span>
                  <select name="role" defaultValue={p.role} className="w-full bg-transparent border-b py-2 text-sm" style={{ borderColor: "var(--color-rule)" }}>
                    <option value="visitor">Visitor</option>
                    <option value="seller">Seller</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="col-span-6 block">
                  <span className="block mb-1 text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>Brand (sellers only)</span>
                  <select name="brand" defaultValue={p.brand ?? ""} className="w-full bg-transparent border-b py-2 text-sm" style={{ borderColor: "var(--color-rule)" }}>
                    <option value="">—</option>
                    {(brands ?? []).map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                  </select>
                </label>
                <button type="submit" className="col-span-2 py-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
                  Save
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
