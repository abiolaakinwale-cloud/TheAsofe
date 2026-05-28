import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { updateJournalPost } from "../../actions";
import JournalFields from "../../_components/JournalFields";

export default async function EditJournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = getAdminSupabase();
  const [{ data: post }, { data: brands }] = await Promise.all([
    sb.from("journal_posts").select("*").eq("slug", slug).maybeSingle(),
    sb.from("brands").select("slug, name").order("name"),
  ]);
  if (!post) notFound();

  return (
    <>
      <Link href="/admin/journal" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Back to journal
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>Edit essay</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>{post.title}</h1>

      <form action={updateJournalPost.bind(null, slug)} className="space-y-8 max-w-4xl">
        <JournalFields
          brands={brands ?? []}
          d={{
            slug: post.slug,
            title: post.title,
            eyebrow: post.eyebrow,
            excerpt: post.excerpt,
            body: post.body,
            hero_image: post.hero_image,
            brand: post.brand,
            published: post.published,
          }}
        />
        <div className="pt-4 flex gap-4 flex-wrap">
          <button type="submit" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Save changes
          </button>
          <Link href="/admin/journal" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium border" style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
