// Compare tables/functions in schema.sql vs what's live in Supabase.
// Run from project root: node scripts/check-db.mjs
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const schema = readFileSync("supabase/schema.sql", "utf8");
const expectedTables = [...schema.matchAll(/create table if not exists public\.(\w+)/gi)].map(m => m[1]).sort();
const expectedFunctions = [
  ...new Set(
    [...schema.matchAll(/create or replace function public\.(\w+)/gi)].map(m => m[1])
  ),
].sort();

async function tableExists(name) {
  const { error } = await sb.from(name).select("*", { count: "exact", head: true });
  if (error) return { exists: false, error: error.message };
  return { exists: true };
}

async function functionExists(name) {
  // pg_proc lookup via PostgREST RPC isn't available — use raw fetch with the REST endpoint
  // and let invalid-args errors confirm the function is at least registered.
  // We just check pg_catalog through a tiny RPC by hitting the SQL via /rest/v1/rpc/<name> with empty body.
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  // 404 → not found. 400/200/anything else → exists (just bad args).
  return { exists: res.status !== 404, status: res.status };
}

console.log("\n=== TABLES ===");
const tableResults = [];
for (const t of expectedTables) {
  const r = await tableExists(t);
  tableResults.push({ t, ...r });
  console.log(`${r.exists ? "✓" : "✗"} ${t}${r.exists ? "" : "  — " + r.error}`);
}

console.log("\n=== FUNCTIONS ===");
const fnResults = [];
for (const f of expectedFunctions) {
  const r = await functionExists(f);
  fnResults.push({ f, ...r });
  console.log(`${r.exists ? "✓" : "✗"} ${f}  (HTTP ${r.status})`);
}

console.log("\n=== ROW COUNTS ===");
for (const t of expectedTables) {
  const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
  if (error) continue;
  console.log(`${String(count).padStart(6)}  ${t}`);
}

const missingTables = tableResults.filter(r => !r.exists);
const missingFns = fnResults.filter(r => !r.exists);
console.log(`\nMissing tables: ${missingTables.length}`);
console.log(`Missing functions: ${missingFns.length}`);
process.exit(missingTables.length + missingFns.length > 0 ? 1 : 0);
