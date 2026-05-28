import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJournalPost, getPublishedJournalPosts } from "@/lib/cms";
import { getBrand } from "@/lib/queries";

export async function generateStaticParams() {
  const posts = await getPublishedJournalPosts();
  return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post || !post.published) return {};
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
  };
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post || !post.published) notFound();

  const brand = post.brand ? await getBrand(post.brand) : null;
  const paragraphs = post.body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  return (
    <article>
      {/* Hero */}
      <section className="relative" style={{ backgroundColor: "var(--color-ink)" }}>
        <div className="relative aspect-[16/9] lg:aspect-[21/9]">
          <Image
            src={post.heroImage}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 flex items-end" style={{ background: "linear-gradient(to top, rgba(26,24,21,0.85) 0%, rgba(26,24,21,0.2) 60%)" }}>
            <div className="max-w-[88rem] mx-auto px-6 lg:px-12 pb-12 lg:pb-20 w-full">
              {post.eyebrow && (
                <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>{post.eyebrow}</p>
              )}
              <h1 className="display text-[clamp(2.4rem,6vw,5.4rem)] max-w-[22ch] leading-[1.04]" style={{ color: "var(--color-ground)" }}>
                {post.title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[44rem] mx-auto px-6 lg:px-12">
          {post.excerpt && (
            <p className="serif text-xl lg:text-2xl italic mb-12 leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              {post.excerpt}
            </p>
          )}
          {paragraphs.map((para, i) => (
            <p key={i} className="text-base lg:text-lg leading-[1.8] mb-7" style={{ color: "var(--color-ink)" }}>
              {para}
            </p>
          ))}

          {brand && (
            <div className="mt-16 pt-8 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>The house</p>
              <Link href={`/brands/${brand.slug}`} className="serif text-2xl lux-link" style={{ color: "var(--color-ink)" }}>
                {brand.name}
              </Link>
              <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>{brand.origin} · est. {brand.founded}</p>
            </div>
          )}

          <div className="mt-16">
            <Link href="/editorial" className="text-[12px] tracking-[0.22em] uppercase font-medium lux-link" style={{ color: "var(--color-ink)" }}>
              ← All essays
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
