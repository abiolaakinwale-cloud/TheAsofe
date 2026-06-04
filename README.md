# Asofe

Multi-vendor marketplace for independent African fashion designers. UK-fulfilled, GBP checkout.

**Live**: https://theasofe.vercel.app

## Stack

- **Next.js 16** App Router · React 19 · TypeScript · Tailwind CSS v4 · Turbopack
- **Supabase** Postgres + Auth + Storage (provisioned via Vercel Marketplace)
- **Stripe** Checkout (merchant of record; manual payouts to designers)
- **Resend** transactional email (orders, shipments, low-stock, applications)
- **Sentry** scaffolded — activates when `NEXT_PUBLIC_SENTRY_DSN` is set
- **Vercel** hosting + Analytics + Speed Insights

## Local development

```bash
# 1. Install
npm install

# 2. Pull env vars from Vercel (project must already be linked)
vercel env pull .env.local
# …or copy .env.example to .env.local and fill manually.

# 3. Apply database schema (idempotent)
npm run db:migrate

# 4. Run
npm run dev
```

## Scripts

### App lifecycle

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with Turbopack |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply `supabase/schema.sql` to the linked Postgres |
| `npm run db:seed` | Seed canonical content (categories, brands, sellers) |
| `vercel` | Deploy a preview |
| `vercel --prod` | Promote to production |

### Operational tooling (`scripts/`)

| Script | What it does |
|---|---|
| `check-db.mjs` | Verify every table + function in `schema.sql` exists live; print row counts |
| `check-storage.mjs` | Verify Supabase Storage buckets + their contents |
| `inspect-latest-order.mjs` | Inspect the 3 most recent orders end-to-end (status, Stripe payment intent, address, per-line-item stock state) |
| `smoke-checkout.mjs` | End-to-end Stripe webhook smoke test against production — signs a synthetic event, verifies order flips to `paid`, stock decrements. `--cleanup` undoes and restores stock. |
| `admin-set-password.mjs <email> <pw>` | Set a password directly (bypasses email flow — useful when Supabase Site URL isn't configured yet) |
| `generate-recovery-link.mjs <email>` | Generate a one-shot password-recovery link |
| `list-users.mjs` | Dump every Supabase auth user + their `profiles` row |
| `create-demo-accounts.mjs` / `delete-demo-accounts.mjs` | Provision/teardown demo customer + brand + staff accounts (pre-launch convenience — strip before public launch) |
| `seed-cms.mjs` · `seed-editorial-journal.mjs` · `seed-stock.mjs` · `update-asofe-images.mjs` | Catalogue + content seeders |

## Project layout

```
app/
  /                      Customer storefront homepage
  /[category]            Department pages (womenswear, menswear, bags, shoes, jewellery)
  /accessories           Jewellery roll-up
  /new-arrivals          Products flagged new_arrival
  /brands                Designer index
  /brands/[slug]         Individual designer page
  /products/[slug]       Product detail
  /search                Global search
  /editorial             Journal index + posts
  /concierge /stockists  Service pages
  /contact /shipping /returns /privacy /terms   Static pages
  /account/              Customer account: overview, orders, addresses
  /bag/                  Cart + checkout entry
  /dashboard/            Seller (brand) dashboard: products, orders,
                         shipments, bulk CSV import
  /admin/                Operations: orders, shipments, applications, brands,
                         users, CMS, journal, inventory, fulfilment
  /signin /admin-signin  Auth (email + password, Customer/Staff toggle)
  /auth/                 Auth callback + password reset

components/              Shared UI (Navigation, ProductCard, CategoryFilters,
                         SearchOverlay, admin/ImagePicker, PageHero, …)

lib/
  supabase/              Server / browser / admin / middleware clients
  queries.ts             Public catalog reads (anon client)
  cms.ts                 Site-settings reads + DEFAULT_SITE_SETTINGS
  bag.ts                 Cookie-based cart
  stripe.ts              Checkout config
  notifications.ts       Single source for all transactional email
  filters.ts             URL-driven filter/sort logic for catalog pages
  csv.ts                 Minimal CSV parser for bulk import

supabase/schema.sql      Idempotent schema (tables, RPCs, RLS, Storage buckets)
public/asofe/            Founder-supplied brand imagery
proxy.ts                 Middleware: auth-gates /admin, /dashboard, /account
```

## Auth

Email + password via Supabase Auth. Two log-in pages:
- `/signin` — customer-facing (warm theme)
- `/admin-signin` — staff (dark, `noindex`)

Both run on the same backend. Sign-up is a toggle on each form. Password reset
goes via `/auth/reset`. First sign-in auto-creates a `profiles` row via the
`handle_new_user` trigger; the founder email is auto-promoted to admin.

## Row-level security

- Public reads on `categories`, `brands`, `products` (published only),
  `journal_posts` (published only), `site_settings`, stock levels.
- Sellers can only `SELECT/INSERT/UPDATE/DELETE` rows where
  `brand = current_brand()`.
- Customers can only read their own orders / items / addresses.
- Admin overrides everything via `is_admin()`.
- Storage buckets: `product-images` (seller writes own folder),
  `site-images` (admin-only write). Both public-read.

## Notable architecture decisions

- **Variants** — Products can declare `colours[]`. `stock_levels` is keyed `(product_slug, colour, size)`, and the `decrement_stock` / `increment_stock` RPCs are colour-aware. Single-colour legacy products keep working unchanged (empty `colours[]` → falls through to `products.colour`).
- **Webhook idempotency** — The Stripe webhook short-circuits when `orders.status !== "pending"`, so Stripe retries are safe.
- **Pagination** — 48 per page, pure UI-layer slice over the filtered set so filter facets compute against the full result. Lives in `lib/pagination.ts` + `components/Pagination.tsx`.
- **SEO** — Dynamic `sitemap.xml` includes every product/brand/category. JSON-LD `Product` schema with live stock availability ships on every product page; `Brand`, `Article`, `Organization`, `WebSite`+SearchAction, and `BreadcrumbList` schemas where applicable. Canonicals point at the eventual `www.theasofe.com` URL.
- **Mobile** — 44px minimum tap targets across nav, bag, sign-in, filters. Inputs ≥ 16px to avoid iOS auto-zoom. Theme-color set for both light + dark scheme.

## Open issues / next steps

- **Stripe live keys** — test keys live; swap to `sk_live_*` when ready (5-min job)
- **Resend domain verification** — API key wired; `theasofe.com` registered. Add 3 DNS records at the registrar, then call `/domains/verify`. Until verified, only the account-holder email receives mail.
- **Sentry DSN** — instrumentation present; just needs `NEXT_PUBLIC_SENTRY_DSN`
- **Log drains** — needs Vercel Pro plan
- **UK courier integration** — Royal Mail Click & Drop / DPD decision pending
- **Demo wiring** — Strip `app/signin/demo-actions.ts`, `demoRole` props × 3, and demo scripts before public launch

## Deploys

The project is connected to GitHub (`abiolaakinwale-cloud/TheAsofe`) and auto-deploys via the Vercel GitHub App:

- Push to `main` → production deploy (theasofe.com)
- Push to any other branch → preview deploy with a unique URL

Manual CLI deploys still work as a fallback:
```bash
vercel          # preview
vercel --prod   # production
```

## Notes

- Project lives in OneDrive. `.git/` inside OneDrive can be slow and occasionally lock files; consider excluding `.git/` from OneDrive sync if you hit issues.
- The 18 founder-supplied brand images live in `asofe images/` (source) and `public/asofe/` (kebab-case copies referenced from code).
