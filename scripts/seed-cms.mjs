import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const defaults = {
  hero: {
    eyebrow: "Volume Seventeen · Spring",
    title: "For the considered wardrobe.",
    body:
      "A curated correspondence between independent African maisons and the people who wear them. " +
      "Eight houses. One season. A small number of garments, made carefully.",
    image: "https://images.nappy.co/photo/VKRCXdbDnwuoMcRLxMBLo.jpg?width=1800",
    primaryLabel: "Discover the season",
    primaryHref: "/new-arrivals",
    secondaryLabel: "Read the journal",
    secondaryHref: "/editorial",
  },
  journal: {
    eyebrow: "The Journal · No. 32",
    title: "A correspondence from Iseyin.",
    body:
      "We visited the looms of Atelier Adunni in the early hours of the morning. The harmattan wind, as it always is " +
      "in February, was dry and unsparing. The cloth, by contrast, was neither.",
    image: "https://images.nappy.co/photo/aMIz_AAzz3h3K8qAOGtgk.jpg?width=1400",
    label: "Read the essay",
    href: "/editorial/correspondence-adunni",
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

const sampleJournal = {
  slug: "correspondence-adunni",
  title: "A correspondence from Iseyin.",
  eyebrow: "The Journal · No. 32",
  excerpt: "On the looms of Atelier Adunni, the harmattan, and the long quiet of weaving.",
  body:
    "We visited the looms of Atelier Adunni in the early hours of the morning. " +
    "The harmattan wind, as it always is in February, was dry and unsparing. The cloth, by contrast, was neither.\n\n" +
    "Adunni Bakare, who founded the atelier in 2014 off Awolowo Road, spoke quietly as she watched a weaver finish a length of indigo aso oke. " +
    "There is a rhythm to it that is impossible to hurry, she said. The shuttle moves at the speed it moves. The cloth knows.\n\n" +
    "The cooperative in Iseyin, where the cloth is loomed, has worked together for nearly two decades. " +
    "Twelve weavers, three of them now retired, several of them in their twenties. " +
    "The cloth is finished in Lagos — pressed, bound, cut. " +
    "Every garment from the house carries, in some form, the hand of every weaver who came before.",
  hero_image: "https://images.nappy.co/photo/aMIz_AAzz3h3K8qAOGtgk.jpg?width=1800",
  brand: "atelier-adunni",
  published: true,
  published_at: new Date().toISOString(),
};

const c = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING });
await c.connect();

await c.query(
  `insert into public.site_settings (id, data) values (1, $1)
   on conflict (id) do nothing`,
  [JSON.stringify(defaults)]
);
console.log("site_settings seeded (no overwrite).");

await c.query(
  `insert into public.journal_posts (slug, title, eyebrow, excerpt, body, hero_image, brand, published, published_at)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
   on conflict (slug) do nothing`,
  [
    sampleJournal.slug,
    sampleJournal.title,
    sampleJournal.eyebrow,
    sampleJournal.excerpt,
    sampleJournal.body,
    sampleJournal.hero_image,
    sampleJournal.brand,
    sampleJournal.published,
    sampleJournal.published_at,
  ]
);
console.log("journal_posts seeded with one starter post (correspondence-adunni).");

await c.end();
