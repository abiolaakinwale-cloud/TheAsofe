import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedJournalPosts } from "@/lib/cms";

export const metadata: Metadata = {
  title: "The Journal",
  description: "Correspondences from independent African designers.",
};

export default async function EditorialIndexPage() {
  const posts = await getPublishedJournalPosts();

  return (
    <>
      <section style={{ backgroundColor: "var(--color-emerald)", color: "var(--color-ground)" }}>
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12 py-24 lg:py-32">
          <p className="eyebrow mb-6" style={{ color: "var(--color-saffron-soft)" }}>The Journal</p>
          <h1 className="display text-[clamp(2.6rem,6vw,5.4rem)] max-w-[18ch] mb-8">
            Correspondences from the designers.
          </h1>
          <p className="text-base lg:text-lg leading-relaxed max-w-xl" style={{ color: "rgba(255,255,255,0.78)" }}>
            Notes from the workshops, the looms, the cutting floors. Read, slowly.
          </p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-[100rem] mx-auto px-6 lg:px-12">
          {posts.length === 0 ? (
            <p className="text-center py-24 text-sm" style={{ color: "var(--color-muted)" }}>
              The first essays are being written.
            </p>
          ) : (
            <ul className="space-y-20 lg:space-y-28">
              {posts.map((p, i) => {
                const reverse = i % 2 === 1;
                return (
                  <li key={p.slug}>
                    <Link href={`/editorial/${p.slug}`} className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center group">
                      <div className={`relative aspect-[4/5] lg:col-span-6 overflow-hidden ${reverse ? "lg:order-2" : ""}`} style={{ backgroundColor: "var(--color-cream)" }}>
                        <Image
                          src={p.heroImage}
                          alt={p.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-cover product-image"
                        />
                      </div>
                      <div className="lg:col-span-6">
                        {p.eyebrow && <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>{p.eyebrow}</p>}
                        <h2 className="display text-3xl lg:text-5xl mb-6 leading-tight" style={{ color: "var(--color-ink)" }}>{p.title}</h2>
                        {p.excerpt && (
                          <p className="text-base lg:text-lg leading-relaxed max-w-lg mb-6" style={{ color: "var(--color-ink-soft)" }}>{p.excerpt}</p>
                        )}
                        <span className="text-[12px] tracking-[0.18em] uppercase font-medium pb-1 border-b" style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}>
                          Read the essay
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
