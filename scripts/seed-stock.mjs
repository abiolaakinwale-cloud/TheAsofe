import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const STARTING_QTY = 10;

const c = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING });
await c.connect();

const { rows } = await c.query("select slug, sizes from public.products");
let added = 0;
for (const r of rows) {
  for (const size of r.sizes ?? []) {
    const ins = await c.query(
      `insert into public.stock_levels (product_slug, size, quantity)
       values ($1,$2,$3)
       on conflict (product_slug, size) do nothing`,
      [r.slug, size, STARTING_QTY]
    );
    added += ins.rowCount;
  }
}
console.log(`stock_levels seeded — inserted ${added} new (product, size) rows.`);
await c.end();
