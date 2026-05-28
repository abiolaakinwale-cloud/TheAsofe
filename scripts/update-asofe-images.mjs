// One-off: point category + (optional) site_settings hero images at the
// new locally-hosted /asofe/* PNGs the founder supplied. Idempotent.
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error("POSTGRES_URL_NON_POOLING is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const updates = [
  { slug: "womenswear", image: "/asofe/category-womens.png" },
  { slug: "menswear",   image: "/asofe/category-mens.png"   },
];

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  for (const u of updates) {
    const res = await client.query(
      "update public.categories set hero_image = $1 where slug = $2 returning slug",
      [u.image, u.slug]
    );
    console.log(res.rowCount > 0 ? `✓ ${u.slug} → ${u.image}` : `· ${u.slug} not found, skipped`);
  }

  // If a site_settings row exists, blank it so DEFAULT_SITE_SETTINGS (now
  // pointing at /asofe/*) takes effect on next render. Skip if no row.
  const ssRes = await client.query("delete from public.site_settings where id = 1");
  console.log(ssRes.rowCount > 0 ? "✓ site_settings cleared (defaults will apply)" : "· site_settings empty, defaults already apply");

  console.log("Done.");
} finally {
  await client.end();
}
