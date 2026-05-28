import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createJournalPost } from "../actions";
import JournalFields from "../_components/JournalFields";

export default async function NewJournalPostPage() {
  const sb = getAdminSupabase();
  const { data: brands } = await sb.from("brands").select("slug, name").order("name");

  return (
    <>
      <Link href="/admin/journal" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Back to journal
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>New essay</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>An untitled correspondence.</h1>

      <form action={createJournalPost} className="space-y-8 max-w-4xl">
        <JournalFields brands={brands ?? []} />
        <div className="pt-4">
          <button type="submit" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Save essay
          </button>
        </div>
      </form>
    </>
  );
}
