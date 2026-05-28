import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const data = await import("../lib/data.ts");

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error("POSTGRES_URL_NON_POOLING is not set.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("begin");

  console.log("Seeding categories...");
  for (let i = 0; i < data.categories.length; i++) {
    const c = data.categories[i];
    await client.query(
      `insert into public.categories (slug, name, description, hero_image, sort_order)
       values ($1, $2, $3, $4, $5)
       on conflict (slug) do update set
         name = excluded.name,
         description = excluded.description,
         hero_image = excluded.hero_image,
         sort_order = excluded.sort_order`,
      [c.slug, c.name, c.description, c.heroImage, i]
    );
  }

  console.log("Seeding brands...");
  for (const b of data.brands) {
    await client.query(
      `insert into public.brands (slug, name, tagline, founded, origin, story, hero_image)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (slug) do update set
         name = excluded.name,
         tagline = excluded.tagline,
         founded = excluded.founded,
         origin = excluded.origin,
         story = excluded.story,
         hero_image = excluded.hero_image`,
      [b.slug, b.name, b.tagline, b.founded, b.origin, b.story, b.heroImage]
    );
  }

  console.log("Seeding sellers...");
  for (const s of data.sellers) {
    await client.query(
      `insert into public.sellers (slug, name, type, location)
       values ($1,$2,$3,$4)
       on conflict (slug) do update set
         name = excluded.name,
         type = excluded.type,
         location = excluded.location`,
      [s.slug, s.name, s.type, s.location]
    );
  }

  console.log("Seeding products...");
  for (const p of data.products) {
    await client.query(
      `insert into public.products
         (slug, name, brand, seller, category, subcategory, price, currency,
          description, composition, made_in, sizes, colour, images, new_arrival, featured)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (slug) do update set
         name = excluded.name,
         brand = excluded.brand,
         seller = excluded.seller,
         category = excluded.category,
         subcategory = excluded.subcategory,
         price = excluded.price,
         currency = excluded.currency,
         description = excluded.description,
         composition = excluded.composition,
         made_in = excluded.made_in,
         sizes = excluded.sizes,
         colour = excluded.colour,
         images = excluded.images,
         new_arrival = excluded.new_arrival,
         featured = excluded.featured,
         updated_at = now()`,
      [
        p.slug,
        p.name,
        p.brand,
        p.seller,
        p.category,
        p.subcategory ?? null,
        p.price,
        p.currency,
        p.description,
        p.composition,
        p.madeIn,
        p.sizes,
        p.colour,
        p.images,
        Boolean(p.newArrival),
        Boolean(p.featured),
      ]
    );
  }

  await client.query("commit");
  console.log(
    `Seed done. Categories=${data.categories.length}, brands=${data.brands.length}, sellers=${data.sellers.length}, products=${data.products.length}`
  );
} catch (err) {
  await client.query("rollback");
  throw err;
} finally {
  await client.end();
}
