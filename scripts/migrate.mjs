import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Supabase pooled connections use a self-signed cert in the chain. We trust the
// connection string itself (it came from Vercel-provisioned env), so disable
// chain verification for this short-lived migration connection.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error("POSTGRES_URL_NON_POOLING is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const sql = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false, requestCert: true },
});
await client.connect();
try {
  await client.query(sql);
  console.log("Schema applied.");
} finally {
  await client.end();
}
