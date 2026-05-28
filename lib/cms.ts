import { getAnonSupabase } from "./supabase/anon";

// Single source of truth for everything an admin can tweak from /admin/cms.
// Keep this in sync with the form in /admin/cms/page.tsx.
export type SiteSettings = {
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    image: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  journal: {
    eyebrow: string;
    title: string;
    body: string;
    image: string;
    label: string;
    href: string;
  };
  concierge: {
    eyebrow: string;
    title: string;
    body: string;
    label: string;
    href: string;
  };
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  hero: {
    eyebrow: "The Home of African Fashion",
    title: "Premium African fashion, fulfilled from the UK.",
    body:
      "Curated pieces from independent African maisons — delivered quickly to the UK and Europe, " +
      "with secure GBP checkout and a local returns address.",
    image: "/asofe/hero-main.png",
    primaryLabel: "Shop the collections",
    primaryHref: "/brands",
    secondaryLabel: "Read the journal",
    secondaryHref: "/editorial",
  },
  journal: {
    eyebrow: "From the journal",
    title: "Ankara, reimagined.",
    body:
      "Bold prints, modern silhouettes. A closer look at how the season's independent designers are reinterpreting " +
      "Ankara for the contemporary wardrobe.",
    image: "/asofe/journal-card.png",
    label: "Read the essay",
    href: "/editorial",
  },
  concierge: {
    eyebrow: "The Concierge",
    title: "Personal advice, by appointment.",
    body:
      "Our concierge is available by telephone, video, or in our Paris atelier. Tailoring, fitting, and styling " +
      "for the considered wardrobe.",
    label: "Request an appointment",
    href: "/concierge",
  },
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const sb = getAnonSupabase();
  const { data } = await sb.from("site_settings").select("data").eq("id", 1).maybeSingle();
  if (!data?.data) return DEFAULT_SITE_SETTINGS;
  // Merge against defaults so newly added fields don't break old rows.
  return mergeSettings(DEFAULT_SITE_SETTINGS, data.data as Partial<SiteSettings>);
}

function mergeSettings(a: SiteSettings, b: Partial<SiteSettings>): SiteSettings {
  return {
    hero:      { ...a.hero, ...(b.hero ?? {}) },
    journal:   { ...a.journal, ...(b.journal ?? {}) },
    concierge: { ...a.concierge, ...(b.concierge ?? {}) },
  };
}

export type JournalPost = {
  slug: string;
  title: string;
  eyebrow: string | null;
  excerpt: string | null;
  body: string;
  heroImage: string;
  brand: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export async function getPublishedJournalPosts(): Promise<JournalPost[]> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("journal_posts")
    .select("slug, title, eyebrow, excerpt, body, hero_image, brand, published, published_at, created_at")
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false });
  return (data ?? []).map(toJournal);
}

export async function getJournalPost(slug: string): Promise<JournalPost | null> {
  const sb = getAnonSupabase();
  const { data } = await sb
    .from("journal_posts")
    .select("slug, title, eyebrow, excerpt, body, hero_image, brand, published, published_at, created_at")
    .eq("slug", slug)
    .maybeSingle();
  return data ? toJournal(data) : null;
}

export async function getMostRecentJournalPost(): Promise<JournalPost | null> {
  const all = await getPublishedJournalPosts();
  return all[0] ?? null;
}

function toJournal(r: {
  slug: string; title: string; eyebrow: string | null; excerpt: string | null; body: string;
  hero_image: string; brand: string | null; published: boolean;
  published_at: string | null; created_at: string;
}): JournalPost {
  return {
    slug: r.slug,
    title: r.title,
    eyebrow: r.eyebrow,
    excerpt: r.excerpt,
    body: r.body,
    heroImage: r.hero_image,
    brand: r.brand,
    published: r.published,
    publishedAt: r.published_at,
    createdAt: r.created_at,
  };
}
