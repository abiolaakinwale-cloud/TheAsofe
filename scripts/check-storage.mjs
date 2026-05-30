import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const EXPECTED = ["product-images", "site-images"];

console.log("\n=== STORAGE BUCKETS ===");
const { data: buckets, error } = await sb.storage.listBuckets();
if (error) { console.error(error); process.exit(1); }

const byName = new Map(buckets.map(b => [b.name, b]));
for (const name of EXPECTED) {
  const b = byName.get(name);
  if (!b) { console.log(`✗ ${name} — MISSING`); continue; }
  console.log(`✓ ${name}  · public=${b.public}  · created=${b.created_at.slice(0, 10)}`);
}

const unexpected = buckets.filter(b => !EXPECTED.includes(b.name));
if (unexpected.length) {
  console.log("\n=== UNEXPECTED BUCKETS ===");
  for (const b of unexpected) console.log(`  · ${b.name} (public=${b.public})`);
}

console.log("\n=== OBJECT COUNTS (top-level) ===");
for (const name of EXPECTED) {
  if (!byName.has(name)) continue;
  const { data, error } = await sb.storage.from(name).list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) { console.log(`  ${name}: error → ${error.message}`); continue; }
  const folders = data.filter(d => d.id === null).map(d => d.name);
  const files   = data.filter(d => d.id !== null);
  console.log(`  ${name}: ${files.length} files at root, ${folders.length} folders (${folders.slice(0, 8).join(", ")}${folders.length > 8 ? "…" : ""})`);
  // Count one level deeper for product-images (seller folders)
  if (name === "product-images" && folders.length > 0) {
    let total = files.length;
    for (const f of folders) {
      const { data: inner } = await sb.storage.from(name).list(f, { limit: 1000 });
      if (inner) total += inner.filter(d => d.id !== null).length;
    }
    console.log(`           → ${total} total images across seller folders`);
  }
}
