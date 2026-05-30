// Editorial collections — themed product edits curated by Asofe rather than
// constrained to a single category. Each collection pairs:
//   - A hero image (founder-supplied banner art)
//   - A short curatorial intro
//   - A linked journal essay
//   - A loose product filter (by subcategory keywords or category)
//   - A short list of designer slugs to credit

export type CollectionDef = {
  slug: string;
  name: string;
  eyebrow: string;
  intro: string;
  heroImage: string;
  ground: string;       // accent background colour for the hero
  inkLight?: boolean;   // text on dark ground
  journalSlug: string;  // /editorial/[slug] companion essay
  // Filter: collect any product whose category OR subcategory contains any of these
  // (loose normalised match — same logic as the subcategory pages).
  productMatch: { categories?: string[]; subcategoryKeywords?: string[] };
  designerCredits?: string[]; // brand slugs to credit, optional
};

export const COLLECTIONS: Record<string, CollectionDef> = {
  ankara: {
    slug: "ankara",
    name: "Ankara",
    eyebrow: "The Print Issue",
    intro:
      "Bold prints, modern silhouettes. A curated edit of the season's interpretations of Ankara — from the women on our menswear floor cutting it into wrap coats, to the studios in Lagos and Bonwire working the print into clean tailoring.",
    heroImage: "/asofe/category-ankara.png",
    ground: "var(--color-terracotta)",
    inkLight: true,
    journalSlug: "ankara-reimagined",
    productMatch: { subcategoryKeywords: ["ankara", "print"] },
    designerCredits: ["atelier-adunni", "studio-wangari", "bogolan-studio"],
  },
  occasion: {
    slug: "occasion",
    name: "Occasion",
    eyebrow: "The Occasion Issue",
    intro:
      "Tailoring, drape, and the small details that turn a piece of clothing into something an event is remembered by. Pieces for the weddings, the launches, the long dinners that come with looking like you meant it.",
    heroImage: "/asofe/category-occasion.png",
    ground: "var(--color-oxblood)",
    inkLight: true,
    journalSlug: "occasion-dressing",
    productMatch: {
      subcategoryKeywords: ["suits-blazers", "agbada", "kaftans-boubous", "kaftans-caftans", "dresses", "co-ord-sets"],
    },
    designerCredits: ["maison-diop", "atelier-tessema", "house-of-ndlovu"],
  },
  wedding: {
    slug: "wedding",
    name: "Wedding Guest",
    eyebrow: "The Wedding Issue",
    intro:
      "A small style guide for the diaspora wedding circuit. What travels well in a carry-on; what photographs well in the soft-flash of a ceremony; what you'll still want to wear at the next one, three years from now.",
    heroImage: "/asofe/category-wedding.png",
    ground: "var(--color-blush)",
    inkLight: false,
    journalSlug: "wedding-guest-looks",
    productMatch: {
      subcategoryKeywords: ["dresses", "jumpsuits-playsuits", "agbada", "suits-blazers", "abayas-modest-wear"],
    },
    designerCredits: ["atelier-adunni", "maison-diop", "kente-co"],
  },
  contemporary: {
    slug: "contemporary",
    name: "Contemporary Designers",
    eyebrow: "The Future Issue",
    intro:
      "An edit of the houses on our floor who are making the most interesting clothing on the continent right now — not by preserving anything, but by building on what they grew up with and making clothes their friends actually want to wear next Saturday.",
    heroImage: "/asofe/banner-contemporary.png",
    ground: "var(--color-ink)",
    inkLight: true,
    journalSlug: "contemporary-african-designers",
    productMatch: {
      categories: ["menswear", "womenswear"],
      subcategoryKeywords: ["shirts", "trousers", "trousers-wide-leg", "tops-blouses", "outerwear", "outerwear-jackets"],
    },
    designerCredits: ["studio-wangari", "atelier-tessema", "talla"],
  },
};

export function getCollection(slug: string): CollectionDef | null {
  return COLLECTIONS[slug] ?? null;
}

export function listCollections(): CollectionDef[] {
  return Object.values(COLLECTIONS);
}
