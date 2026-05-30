// Subcategory navigation per category. Slugs become URL segments
// (/<category>/<subcategory>) and must match the products.subcategory value
// for any product that should appear under that pill.

export type Subcategory = { slug: string; name: string };

export const SUBCATEGORIES: Record<string, Subcategory[]> = {
  menswear: [
    { slug: "suits-blazers",    name: "Suits & Blazers" },
    { slug: "shirts",           name: "Shirts" },
    { slug: "trousers",         name: "Trousers" },
    { slug: "kaftans-boubous",  name: "Kaftans & Boubous" },
    { slug: "co-ord-sets",      name: "Co-ord Sets" },
    { slug: "outerwear",        name: "Outerwear" },
    { slug: "agbada",           name: "Agbada" },
    { slug: "ankara-print",     name: "Ankara & Print" },
  ],
  accessories: [
    { slug: "belts",              name: "Belts" },
    { slug: "gloves",             name: "Gloves" },
    { slug: "hair-accessories",   name: "Hair Accessories" },
    { slug: "hats",               name: "Hats" },
    { slug: "scarves-wraps",      name: "Scarves and Wraps" },
    { slug: "sports-accessories", name: "Sports Accessories" },
    { slug: "sunglasses",         name: "Sunglasses" },
    { slug: "wallets",            name: "Wallets" },
  ],
  womenswear: [
    { slug: "abayas-modest-wear",   name: "Abayas & Modest Wear" },
    { slug: "ankara-print",         name: "Ankara & Print" },
    { slug: "aso-oke-pieces",       name: "Aso Oke Pieces" },
    { slug: "co-ord-sets",          name: "Co-ord Sets" },
    { slug: "dresses",              name: "Dresses" },
    { slug: "jumpsuits-playsuits",  name: "Jumpsuits & Playsuits" },
    { slug: "kaftans-caftans",      name: "Kaftans & Caftans" },
    { slug: "outerwear-jackets",    name: "Outerwear & Jackets" },
    { slug: "skirts",               name: "Skirts" },
    { slug: "tops-blouses",         name: "Tops & Blouses" },
    { slug: "trousers-wide-leg",    name: "Trousers & Wide-Leg" },
  ],
};

export function getSubcategories(category: string): Subcategory[] {
  return SUBCATEGORIES[category] ?? [];
}

export function findSubcategory(category: string, slug: string): Subcategory | null {
  return getSubcategories(category).find(s => s.slug === slug) ?? null;
}
