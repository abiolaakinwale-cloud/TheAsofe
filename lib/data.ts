// Types + formatting only. The catalog itself now lives in Supabase — see
// `lib/queries.ts` for server-side data fetchers and `supabase/schema.sql`
// for the source-of-truth table definitions.

export type Brand = {
  slug: string;
  name: string;
  tagline: string;
  founded: string;
  origin: string;
  story: string;
  heroImage: string;
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  heroImage: string;
};

export type Seller = {
  slug: string;
  name: string;
  type: "Maison" | "Atelier" | "Independent" | "Archive";
  location: string;
};

export type Product = {
  slug: string;
  name: string;
  brand: string;
  seller: string;
  category: string;
  subcategory?: string;
  price: number;
  currency: "GBP";
  description: string;
  composition: string[];
  madeIn: string;
  sizes: string[];
  colour: string;
  images: string[];
  newArrival?: boolean;
  featured?: boolean;
  madeToOrder?: boolean;
  leadTimeWeeks?: number;
};

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
