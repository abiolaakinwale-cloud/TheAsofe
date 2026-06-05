// One-off, idempotent: unpublish every product row in the live catalog.
//
// Run while Asofe has no signed designers. Flipping products.published = false
// hides them from every public query (lib/queries.ts filters by published=true)
// without losing the data — re-enable per-row from the admin/dashboard when a
// real designer signs and uploads real product.
//
// Usage:
//   node scripts/prelaunch-unpublish-catalog.mjs
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error("POSTGRES_URL_NON_POOLING is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const before = await client.query(
    "select count(*) filter (where published) as pub, count(*) filter (where not published) as unpub from public.products"
  );
  console.log(`Before: published=${before.rows[0].pub}, unpublished=${before.rows[0].unpub}`);

  const res = await client.query(
    "update public.products set published = false, updated_at = now() where published = true returning slug"
  );
  console.log(`Unpublished ${res.rowCount} product(s):`);
  for (const r of res.rows) console.log(`  · ${r.slug}`);

  const after = await client.query(
    "select count(*) filter (where published) as pub, count(*) filter (where not published) as unpub from public.products"
  );
  console.log(`After:  published=${after.rows[0].pub}, unpublished=${after.rows[0].unpub}`);
} finally {
  await client.end();
}
