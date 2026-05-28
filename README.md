# Asofe

Multi-vendor marketplace for independent African fashion designers. UK-fulfilled, GBP checkout.

**Live**: https://theasofe.vercel.app

## Stack

- **Next.js 16** App Router · React 19 · TypeScript · Tailwind CSS v4 · Turbopack
- **Supabase** Postgres + Auth + Storage (provisioned via Vercel Marketplace)
- **Stripe** Checkout (merchant of record; manual payouts to designers)
- **Resend** transactional email (orders, shipments, low-stock, applications)
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

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with Turbopack |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply `supabase/schema.sql` to the linked Postgres |
| `npm run db:seed` | Seed canonical content (categories, brands, sellers) |
| `vercel` | Deploy a preview |
| `vercel --prod` | Promote to production |

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

## Open issues / next steps

- **Stripe live keys** — checkout returns "configuring" until set
- **Resend** — set `RESEND_API_KEY` + verify sender domain
- **Sentry / error tracking** — install `@sentry/nextjs` and set `NEXT_PUBLIC_SENTRY_DSN`
- **Log drains** — needs Vercel Pro plan
- **UK courier integration** — Royal Mail Click & Drop / DPD decision pending

## Deploys

Always preview first:
```bash
vercel
```
Then promote:
```bash
vercel --prod
```

## Notes

- Project lives in OneDrive. `.git/` inside OneDrive can be slow and occasionally lock files; consider excluding `.git/` from OneDrive sync if you hit issues.
- The 18 founder-supplied brand images live in `asofe images/` (source) and `public/asofe/` (kebab-case copies referenced from code).
