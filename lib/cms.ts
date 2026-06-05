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
  // Editable page-level images (no copy — just the image URL or upload).
  images: {
    sellersBand: string;        // homepage "For brands" band
    sellersHero: string;        // /sellers hero
    conciergeFeature: string;   // /concierge "Occasion dressing" image
    stockistsFeature: string;   // /stockists "Book a viewing" image
    signinSide: string;         // /signin right-side image
  };
  // Designer Spotlight — featured designer of the moment. Surfaces on homepage,
  // links to /brands/[slug]/feature for the full editorial treatment.
  spotlight: {
    enabled: boolean;
    brandSlug: string;          // which brand row to feature
    eyebrow: string;
    editorialImage: string;     // cinematic hero shot (founder-supplied or commissioned)
    quote: string;              // a single pull quote, large serif italic on the feature page
    quoteAttribution: string;
  };
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  hero: {
    eyebrow: "Founding Season · 2026",
    title: "Accessible luxury, made in Africa.",
    body:
      "Asofe is the new home for independent African designers — curated craft, UK fulfilment, attainable prices. " +
      "We're opening with a founding cohort of designers. Apply to join, or be first when the doors open.",
    image: "/asofe/hero-main.png",
    primaryLabel: "Apply as a founding designer",
    primaryHref: "/sellers",
    secondaryLabel: "Join the waitlist",
    secondaryHref: "#waitlist",
  },
  journal: {
    eyebrow: "From the journal",
    title: "Notes from the workshops.",
    body:
      "Essays, atelier visits, and the slow craft behind the pieces we're curating for the Asofe floor.",
    image: "/asofe/journal-card.png",
    label: "Read the journal",
    href: "/editorial",
  },
  concierge: {
    eyebrow: "The Concierge",
    title: "Personal advice, by appointment.",
    body:
      "Once the floor opens, our London concierge will be available by telephone or video for tailoring, fitting, " +
      "and styling advice on the considered wardrobe.",
    label: "Request an appointment",
    href: "/concierge",
  },
  images: {
    sellersBand:      "/asofe/sellers-secondary.png",
    sellersHero:      "/asofe/sellers-hero.png",
    conciergeFeature: "/asofe/editorial-occasion.png",
    stockistsFeature: "/asofe/packaging-giftbox.png",
    signinSide:       "/asofe/hero-secondary.png",
  },
  spotlight: {
    enabled:          true,
    brandSlug:        "atelier-adunni",
    eyebrow:          "Designer of the moment",
    editorialImage:   "/asofe/featured-bankekuku.png",
    quote:
      "We don't weave aso oke to preserve it. We weave it because it's the most beautiful cloth we know how to make.",
    quoteAttribution: "From the founder",
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
    images:    { ...a.images, ...(b.images ?? {}) },
    spotlight: { ...a.spotlight, ...(b.spotlight ?? {}) },
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
