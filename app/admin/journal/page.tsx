import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { deleteJournalPost } from "./actions";

export default async function AdminJournalPage() {
  const sb = getAdminSupabase();
  const { data: posts } = await sb
    .from("journal_posts")
    .select("slug, title, brand, published, published_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
        <div>
          <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>The Journal</p>
          <h1 className="display text-4xl lg:text-5xl" style={{ color: "var(--color-ink)" }}>{posts?.length ?? 0} essays.</h1>
        </div>
        <Link href="/admin/journal/new" className="px-7 py-3.5 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
          New essay
        </Link>
      </div>

      {(posts ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>No essays yet.</p>
      ) : (
        <ul className="space-y-px">
          {posts!.map(p => (
            <li key={p.slug} className="p-6 grid grid-cols-12 items-center gap-4" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
              <div className="col-span-12 lg:col-span-6">
                <Link href={`/admin/journal/${p.slug}/edit`} className="serif text-xl lux-link" style={{ color: "var(--color-ink)" }}>{p.title}</Link>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{p.slug}</p>
              </div>
              <p className="col-span-4 lg:col-span-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>{p.brand ?? "—"}</p>
              <div className="col-span-4 lg:col-span-2 flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase" style={{ color: p.published ? "var(--color-emerald)" : "var(--color-muted)" }}>
                <span className="w-1.5 h-1.5" style={{ backgroundColor: p.published ? "var(--color-emerald)" : "var(--color-muted)" }} />
                {p.published ? "Live" : "Draft"}
              </div>
              <div className="col-span-4 lg:col-span-1 flex justify-end">
                <form action={deleteJournalPost.bind(null, p.slug)}>
                  <button type="submit" className="text-[10px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
