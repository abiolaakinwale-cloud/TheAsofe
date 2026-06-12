/**
 * Smoke-test: pending visitor sees approval notice on /bag
 *
 * 1. Creates a fresh Supabase test account (visitor, customer_status=pending)
 * 2. Signs in via the /signin page
 * 3. Seeds a bag cookie with a real product slug
 * 4. Checks /bag shows the pending notice and NO checkout button
 * 5. Admin approves → reload → checkout button appears, notice gone
 * 6. Cleans up the test user
 *
 * Run: node scripts/test-pending-user-bag.mjs
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// ── Load env ──────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })
);
const SUPABASE_URL = env["SUPABASE_URL"] || env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"];
const BASE         = "http://localhost:3333";
const TEST_EMAIL   = `test-pending-${Date.now()}@example.com`;
const TEST_PW      = "TestPass123!";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let passed = 0; let failed = 0;
function ok(label)           { console.log(`  ✓  ${label}`); passed++; }
function fail(label, detail) { console.error(`  ✗  ${label}\n     ${detail}`); failed++; }

// ── Ensure test fixtures exist (brand, seller, category, product) ────────────
const TEST_BRAND    = "test-brand-approval";
const TEST_SELLER   = "test-seller-approval";
const TEST_CATEGORY = "womenswear"; // must exist already
const TEST_PRODUCT  = "test-product-approval";

await admin.from("brands").upsert({ slug: TEST_BRAND, name: "Test Brand", tagline: "Test", founded: "2024", origin: "NG", story: "Test", hero_image: "/placeholder.jpg" });
await admin.from("sellers").upsert({ slug: TEST_SELLER, name: "Test Seller", type: "Independent", location: "London" });
await admin.from("products").upsert({
  slug: TEST_PRODUCT, name: "Test Product", brand: TEST_BRAND, seller: TEST_SELLER,
  category: TEST_CATEGORY, price: 10000, description: "Test", composition: [],
  made_in: "NG", sizes: ["S"], colour: "Black", images: ["/placeholder.jpg"], published: true,
});
await admin.from("stock_levels").upsert({ product_slug: TEST_PRODUCT, colour: "Black", size: "S", quantity: 5 });
console.log(`Test fixtures created: ${TEST_PRODUCT}`);

const productSlug = TEST_PRODUCT;
const bagCookie   = JSON.stringify([{ slug: productSlug, colour: "Black", size: "S", qty: 1 }]);
console.log(`Using product: ${productSlug}`);

// ── Create test user ──────────────────────────────────────────────────────────
console.log(`\nSetup: creating ${TEST_EMAIL}`);
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: TEST_EMAIL, password: TEST_PW, email_confirm: true,
});
if (createErr || !created?.user) { console.error("Create user failed:", createErr); process.exit(1); }
const userId = created.user.id;
await admin.from("profiles").upsert({ id: userId, email: TEST_EMAIL, role: "visitor", customer_status: "pending" });
console.log(`  Profile: role=visitor  customer_status=pending`);

// ── Browser session ───────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const ctx  = await browser.newContext();
const page = await ctx.newPage();

// ── 1. Sign in ────────────────────────────────────────────────────────────────
console.log("\n1. Sign in as pending visitor");
await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]',    TEST_EMAIL);
await page.fill('input[type="password"]', TEST_PW);
await page.click('button[type="submit"]');

// Wait up to 8s for the URL to leave /signin
await page.waitForFunction(() => !window.location.pathname.startsWith("/signin"), { timeout: 8000 }).catch(() => {});
const navText = await page.textContent("nav, header").catch(() => "");
const signedIn = !navText.toLowerCase().includes("log in") && !navText.toLowerCase().includes("sign in");
if (signedIn || !page.url().includes("/signin")) {
  ok(`Signed in (landed on ${page.url()})`);
} else {
  fail("Still on /signin after submit", `URL: ${page.url()}`);
}

// ── 2. Seed bag cookie then visit /bag ────────────────────────────────────────
console.log("\n2. Seed bag with one item, visit /bag");
await ctx.addCookies([{
  name:    "bag",
  value:   bagCookie,
  domain:  "localhost",
  path:    "/",
  sameSite: "Lax",
}]);

await page.goto(`${BASE}/bag`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500); // allow SSR content to hydrate
const body1 = await page.textContent("body");

const hasPending  = body1.includes("awaiting approval") || body1.includes("pending approval");
const hasCheckout = body1.includes("Proceed to checkout");

if (hasPending) {
  ok("Pending visitor sees 'awaiting approval' notice on /bag");
} else {
  fail("Approval notice not found", body1.slice(0, 500));
}
if (!hasCheckout) {
  ok("Checkout button hidden for pending visitor");
} else {
  fail("Checkout button should be hidden but is visible", "");
}

// ── 3. Approve and re-check ───────────────────────────────────────────────────
console.log("\n3. Admin approves the account");
await admin.from("profiles").update({ customer_status: "approved" }).eq("id", userId);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const body2 = await page.textContent("body");
const stillPending    = body2.includes("awaiting approval");
const checkoutVisible = body2.includes("Proceed to checkout");

if (!stillPending) {
  ok("Approval notice gone after approval");
} else {
  fail("Approval notice still showing after approval", "");
}
if (checkoutVisible) {
  ok("Checkout button visible after approval");
} else {
  fail("Checkout button not showing after approval", body2.slice(0, 500));
}

// ── 4. Reject and re-check ────────────────────────────────────────────────────
console.log("\n4. Admin rejects the account");
await admin.from("profiles").update({ customer_status: "rejected" }).eq("id", userId);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const body3 = await page.textContent("body");
const hasRejected  = body3.includes("Account not approved");
const checkoutGone = !body3.includes("Proceed to checkout");

if (hasRejected) {
  ok("Rejected notice shown for rejected visitor");
} else {
  fail("Rejected notice not found", body3.slice(0, 500));
}
if (checkoutGone) {
  ok("Checkout button hidden for rejected visitor");
} else {
  fail("Checkout button should be hidden for rejected visitor", "");
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
await browser.close();
await admin.auth.admin.deleteUser(userId);
await admin.from("products").delete().eq("slug", TEST_PRODUCT);
await admin.from("sellers").delete().eq("slug", TEST_SELLER);
await admin.from("brands").delete().eq("slug", TEST_BRAND);
console.log(`\nCleanup: ${TEST_EMAIL} + test fixtures deleted`);

console.log(`\n${"─".repeat(46)}`);
console.log(`  ${passed} passed  ${failed > 0 ? failed + " FAILED" : ""}`);
console.log(`${"─".repeat(46)}\n`);
if (failed > 0) process.exit(1);
