-- =============================================================================
-- ASOFE MARKETPLACE — SUPABASE MIGRATION
-- Full schema: 19 tables across core commerce + operations + finance
-- Run in Supabase SQL editor or via: npm run db:migrate
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =============================================================================
-- DROP EVERYTHING (old + new) — safe to re-run
-- Order matters: dependents first, then parents.
-- =============================================================================

drop table if exists abandoned_carts      cascade;
drop table if exists gift_cards           cascade;
drop table if exists discount_codes       cascade;
drop table if exists disputes             cascade;
drop table if exists escrow_ledger        cascade;
drop table if exists payouts              cascade;
drop table if exists reviews              cascade;
drop table if exists order_lines          cascade;
drop table if exists shipments            cascade;
drop table if exists orders               cascade;
drop table if exists wishlist             cascade;
drop table if exists bag                  cascade;
drop table if exists variants             cascade;
drop table if exists products             cascade;
drop table if exists brands               cascade;
drop table if exists brand_applications   cascade;
drop table if exists addresses            cascade;
drop table if exists customers            cascade;
drop table if exists users                cascade;

-- Legacy tables from v1 schema
drop table if exists cart_abandonment_state  cascade;
drop table if exists bag_snapshots           cascade;
drop table if exists discount_redemptions    cascade;
drop table if exists discount_codes          cascade;
drop table if exists co_purchase_cache       cascade;
drop table if exists product_copurchases     cascade;
drop table if exists back_in_stock_requests  cascade;
drop table if exists audit_log               cascade;
drop table if exists analytics_events        cascade;
drop table if exists concierge_threads       cascade;
drop table if exists concierge_messages      cascade;
drop table if exists gift_card_redemptions   cascade;
drop table if exists referrals               cascade;
drop table if exists wishlists               cascade;
drop table if exists wishlist_items          cascade;
drop table if exists order_items             cascade;
drop table if exists stock_levels            cascade;
drop table if exists newsletter_subscribers  cascade;
drop table if exists journal_posts           cascade;
drop table if exists site_settings           cascade;
drop table if exists return_requests         cascade;
drop table if exists product_questions       cascade;
drop table if exists applications            cascade;
drop table if exists sellers                 cascade;
drop table if exists categories              cascade;
drop table if exists profiles                cascade;

drop materialized view if exists product_copurchases cascade;

-- Drop enums (re-created below)
drop type if exists user_role         cascade;
drop type if exists brand_status      cascade;
drop type if exists product_status    cascade;
drop type if exists order_status      cascade;
drop type if exists shipment_stage    cascade;
drop type if exists escrow_status     cascade;
drop type if exists payout_status     cascade;
drop type if exists dispute_tier      cascade;
drop type if exists dispute_status    cascade;
drop type if exists discount_type     cascade;
drop type if exists gift_card_status  cascade;
drop type if exists application_status cascade;
drop type if exists delivery_tier     cascade;
drop type if exists recovery_stage    cascade;

-- =============================================================================
-- ENUMS
-- =============================================================================

create type user_role as enum ('admin', 'seller', 'customer');

create type brand_status as enum ('pending', 'approved', 'suspended', 'rejected');

create type product_status as enum ('draft', 'active', 'archived');

create type order_status as enum (
  'pending',
  'payment_confirmed',
  'seller_packing',
  'lagos_collected',
  'in_transit',
  'uk_arrived',
  'dispatched',
  'delivered',
  'cancelled',
  'refunded'
);

create type shipment_stage as enum (
  'awaiting_dispatch',
  'packed',
  'lagos_collected',
  'in_transit',
  'uk_arrived',
  'dispatched_to_customer',
  'delivered'
);

create type escrow_status as enum (
  'holding',
  'disputed',
  'released',
  'refunded'
);

create type payout_status as enum (
  'pending',
  'initiated',
  'settled',
  'failed'
);

create type dispute_tier as enum ('1', '2', '3');

create type dispute_status as enum (
  'open',
  'under_review',
  'resolved',
  'escalated'
);

create type discount_type as enum ('percentage', 'fixed');

create type gift_card_status as enum ('pending', 'active', 'redeemed', 'expired');

create type application_status as enum (
  'submitted',
  'under_review',
  'approved',
  'rejected'
);

create type delivery_tier as enum ('standard', 'express', 'free');

create type recovery_stage as enum ('stage_1', 'stage_2', 'stage_3');

-- =============================================================================
-- 1. USERS
-- Mirrors Supabase auth.users — do not store passwords here.
-- role drives middleware routing: admin → /admin, seller → /dashboard, customer → /account
-- =============================================================================

create table users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique not null,           -- references auth.users(id)
  email         text unique not null,
  full_name     text,
  role          user_role not null default 'customer',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table users is 'Platform identity layer. Mirrors Supabase auth.users.';
comment on column users.auth_id is 'FK to auth.users(id). Used to look up session user.';
comment on column users.role is 'Controls middleware routing and RLS policies.';

create index idx_users_auth_id on users(auth_id);
create index idx_users_email   on users(email);

-- =============================================================================
-- 2. CUSTOMERS
-- Extended buyer profile. One customer per user where role = customer.
-- =============================================================================

create table customers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  phone         text,
  marketing_opt boolean not null default false,
  referral_code text,                            -- ?ref= cookie source
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table customers is 'Extended buyer profile attached to users.';
comment on column customers.referral_code is 'Source ref captured from 30-day referral cookie.';

create unique index idx_customers_user_id on customers(user_id);
create index idx_customers_email on customers(email);

-- =============================================================================
-- 3. ADDRESSES
-- Shipping addresses for customers. Multiple per customer, one default.
-- =============================================================================

create table addresses (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers(id) on delete cascade,
  full_name     text not null,
  line1         text not null,
  line2         text,
  city          text not null,
  county        text,
  postcode      text not null,
  country       text not null default 'GB',
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table addresses is 'Shipping addresses. One default per customer.';

create index idx_addresses_customer_id on addresses(customer_id);

-- Enforce single default per customer
create unique index idx_addresses_one_default
  on addresses(customer_id)
  where is_default = true;

-- =============================================================================
-- 4. BRAND APPLICATIONS
-- Application form submissions from /sellers page. Admin reviews before
-- creating a brands record.
-- =============================================================================

create table brand_applications (
  id               uuid primary key default gen_random_uuid(),
  brand_name       text not null,
  founder_name     text not null,
  instagram        text,
  whatsapp         text not null,
  website          text,
  category         text not null,
  volume_estimate  text not null,           -- e.g. '20–50 pieces / month'
  status           application_status not null default 'submitted',
  admin_notes      text,
  reviewed_by      uuid references users(id),
  applied_at       timestamptz not null default now(),
  reviewed_at      timestamptz
);

comment on table brand_applications is 'Seller applications from /sellers page. Admin approval creates brands record.';

create index idx_brand_applications_status on brand_applications(status);
create index idx_brand_applications_applied_at on brand_applications(applied_at desc);

-- =============================================================================
-- 5. BRANDS
-- Approved seller profiles. Created by admin after brand_application approval.
-- commission_rate is the percentage Asofe retains (e.g. 0.20 = 20%).
-- =============================================================================

create table brands (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete restrict,
  application_id   uuid references brand_applications(id),
  name             text not null,
  slug             text not null unique,
  tagline          text,
  story            text,
  country          text not null,
  city             text,
  founded_year     int,
  instagram        text,
  whatsapp         text not null,
  website          text,
  status           brand_status not null default 'pending',
  commission_rate  numeric(4,3) not null default 0.200,   -- 20.0% default
  logo_url         text,
  hero_url         text,
  approved_by      uuid references users(id),
  approved_at      timestamptz,
  suspended_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table brands is 'Approved seller profiles. Each brand maps to a user with role=seller.';
comment on column brands.commission_rate is 'Decimal fraction Asofe retains. 0.200 = 20%.';
comment on column brands.slug is 'URL-safe identifier. Used in /brands/{slug}.';

create unique index idx_brands_user_id on brands(user_id);
create index idx_brands_status on brands(status);
create index idx_brands_slug on brands(slug);

-- =============================================================================
-- 6. PRODUCTS
-- One product per listing. Variants hold size/colour/stock.
-- price_gbp is the base price; variants may override.
-- =============================================================================

create table products (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references brands(id) on delete cascade,
  title           text not null,
  slug            text not null,
  description     text,
  fabric          text,
  care            text,
  provenance      text,                      -- artisan/origin story
  category        text not null,             -- e.g. 'Womenswear > Dresses'
  subcategory     text,
  price_gbp       numeric(10,2) not null,
  made_to_order   boolean not null default false,
  lead_time_days  int,                       -- if made_to_order = true
  status          product_status not null default 'draft',
  position        int not null default 0,    -- sort order within brand
  tags            text[],
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table products is 'Product listings. Variants hold size/colour/stock.';
comment on column products.provenance is 'Origin and artisan story — core to Asofe brand.';
comment on column products.made_to_order is 'If true, lead_time_days must be set.';

create unique index idx_products_brand_slug on products(brand_id, slug);
create index idx_products_brand_id  on products(brand_id);
create index idx_products_status    on products(status);
create index idx_products_category  on products(category);

-- =============================================================================
-- 7. VARIANTS
-- Size/colour combinations with individual stock tracking.
-- sku must be unique across all brands.
-- =============================================================================

create table variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  size          text not null,              -- e.g. 'XS', 'M', 'UK 12', '38cm'
  colour        text,
  sku           text not null unique,
  price_gbp     numeric(10,2),             -- null = inherits from product
  stock_qty     int not null default 0,
  weight_kg     numeric(5,3),              -- for freight cost calculation
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint variants_stock_non_negative check (stock_qty >= 0)
);

comment on table variants is 'Size/colour combinations. stock_qty decremented by Stripe webhook.';
comment on column variants.price_gbp is 'If null, inherits product.price_gbp.';
comment on column variants.weight_kg is 'Used for freight cost estimation.';

create index idx_variants_product_id on variants(product_id);
create index idx_variants_sku        on variants(sku);

-- =============================================================================
-- 8. BAG
-- Guest and authenticated cart lines. One row per variant per customer.
-- Cleared on order placement or explicit clearBag action.
-- =============================================================================

create table bag (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid references customers(id) on delete cascade,
  session_id    text,                        -- for guest bags (pre-login)
  variant_id    uuid not null references variants(id) on delete cascade,
  qty           int not null default 1,
  added_at      timestamptz not null default now(),
  constraint bag_qty_positive check (qty > 0),
  constraint bag_customer_or_session check (
    customer_id is not null or session_id is not null
  )
);

comment on table bag is 'Active cart lines. customer_id for auth, session_id for guest.';

create unique index idx_bag_customer_variant
  on bag(customer_id, variant_id)
  where customer_id is not null;

create index idx_bag_customer_id  on bag(customer_id);
create index idx_bag_session_id   on bag(session_id);

-- =============================================================================
-- 9. WISHLIST
-- Saved products per customer. Shareable via wishlist share action.
-- =============================================================================

create table wishlist (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  saved_at      timestamptz not null default now(),
  unique(customer_id, product_id)
);

comment on table wishlist is 'Saved products. Unique per customer/product pair.';

create index idx_wishlist_customer_id on wishlist(customer_id);

-- =============================================================================
-- 17. DISCOUNT CODES (moved before orders to satisfy FK reference)
-- Used at checkout. type = percentage (e.g. 10%) or fixed (e.g. £5 off).
-- Welcome code issued by /api/discount/welcome on email capture.
-- =============================================================================

create table discount_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  type          discount_type not null,
  value         numeric(10,2) not null,        -- percent (10.00) or GBP (5.00)
  min_order_gbp numeric(10,2),                  -- minimum basket to apply
  uses_max      int,                            -- null = unlimited
  uses_count    int not null default 0,
  active        boolean not null default true,
  created_by    uuid references users(id),
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  constraint discount_value_positive check (value > 0)
);

comment on table discount_codes is 'Welcome codes and promotional codes. Welcome code = 10% on email capture.';
comment on column discount_codes.value is 'Percentage (10.00 = 10%) or fixed GBP amount depending on type.';

create index idx_discount_codes_code   on discount_codes(code);
create index idx_discount_codes_active on discount_codes(active)
  where active = true;

-- =============================================================================
-- 18. GIFT CARDS (moved before orders to satisfy FK reference)
-- Issued to customers. send_at drives /api/cron/scheduled-gift-cards.
-- balance_gbp decremented on redemption at checkout.
-- =============================================================================

create table gift_cards (
  id            uuid primary key default gen_random_uuid(),
  issued_to     uuid references customers(id) on delete set null,
  issued_by     uuid references users(id),      -- admin who issued
  code          text not null unique,
  initial_gbp   numeric(10,2) not null,
  balance_gbp   numeric(10,2) not null,
  status        gift_card_status not null default 'pending',
  send_to_email text,                            -- recipient if different from issued_to
  send_at       timestamptz,                     -- scheduled send date
  sent_at       timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint gift_card_balance_non_negative check (balance_gbp >= 0),
  constraint gift_card_balance_leq_initial  check (balance_gbp <= initial_gbp)
);

comment on table gift_cards is 'Gift cards. send_at drives daily cron. balance_gbp decremented at checkout.';
comment on column gift_cards.send_at is 'Scheduled send date — processed by /api/cron/scheduled-gift-cards.';

create index idx_gift_cards_code      on gift_cards(code);
create index idx_gift_cards_issued_to on gift_cards(issued_to);
create index idx_gift_cards_send_at   on gift_cards(send_at)
  where status = 'pending' and send_at is not null;

-- =============================================================================
-- 10. ORDERS
-- One order per customer checkout. May span multiple brands (via order_lines).
-- delivered_at is set by Shippo courier tracking webhook.
-- dispute_window_closes_at = delivered_at + 7 days (enforced in application).
-- =============================================================================

create table orders (
  id                          uuid primary key default gen_random_uuid(),
  customer_id                 uuid not null references customers(id) on delete restrict,
  shipping_address_id         uuid references addresses(id),
  status                      order_status not null default 'pending',
  subtotal_gbp                numeric(10,2) not null,
  delivery_gbp                numeric(10,2) not null default 0,
  discount_gbp                numeric(10,2) not null default 0,
  total_gbp                   numeric(10,2) not null,
  delivery_tier               delivery_tier not null default 'standard',
  discount_code_id            uuid references discount_codes(id),
  gift_card_id                uuid references gift_cards(id),
  stripe_payment_intent_id    text unique,
  stripe_session_id           text unique,
  notes                       text,
  placed_at                   timestamptz not null default now(),
  delivered_at                timestamptz,
  dispute_window_closes_at    timestamptz,   -- set to delivered_at + 7 days by app on delivery
  cancelled_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table orders is 'One order per checkout. May span multiple brands via order_lines.';
comment on column orders.dispute_window_closes_at is 'Generated: delivered_at + 7 days. Enforced at application layer.';
comment on column orders.delivery_tier is 'standard: <£60 = £19.99, express: £60-£120 = £14.99, free: >£120.';

create index idx_orders_customer_id on orders(customer_id);
create index idx_orders_status      on orders(status);
create index idx_orders_placed_at   on orders(placed_at desc);
create index idx_orders_stripe_pi   on orders(stripe_payment_intent_id);

-- =============================================================================
-- 11. ORDER LINES
-- One row per variant per brand within an order. Drives escrow and payouts.
-- =============================================================================

create table order_lines (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  variant_id      uuid not null references variants(id) on delete restrict,
  brand_id        uuid not null references brands(id) on delete restrict,
  qty             int not null default 1,
  unit_price_gbp  numeric(10,2) not null,
  line_total_gbp  numeric(10,2) not null,
  created_at      timestamptz not null default now(),
  constraint order_lines_qty_positive check (qty > 0)
);

comment on table order_lines is 'Per-variant lines within an order. brand_id enables multi-brand splitting.';

create index idx_order_lines_order_id   on order_lines(order_id);
create index idx_order_lines_brand_id   on order_lines(brand_id);
create index idx_order_lines_variant_id on order_lines(variant_id);

-- =============================================================================
-- 12. REVIEWS
-- One review per order_line. Prompted by /api/cron/review-prompts at day 14.
-- status: pending → published or rejected by admin.
-- =============================================================================

create table reviews (
  id              uuid primary key default gen_random_uuid(),
  order_line_id   uuid not null unique references order_lines(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete cascade,
  rating          int not null check (rating between 1 and 5),
  body            text,
  status          text not null default 'pending'
                  check (status in ('pending', 'published', 'rejected')),
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz
);

comment on table reviews is 'One review per order_line. Prompted at day 14 post-delivery.';

create index idx_reviews_order_line_id on reviews(order_line_id);
create index idx_reviews_customer_id   on reviews(customer_id);
create index idx_reviews_status        on reviews(status);

-- =============================================================================
-- 13. SHIPMENTS
-- One shipment per order. Three tracking legs: Lagos, international, UK.
-- stage updated by Sendbox, Acorn Global, and Shippo webhooks respectively.
-- =============================================================================

create table shipments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null unique references orders(id) on delete cascade,
  stage               shipment_stage not null default 'awaiting_dispatch',

  -- Lagos leg (Sendbox)
  lagos_tracking      text,
  lagos_carrier       text default 'Sendbox',
  lagos_dispatched_at timestamptz,

  -- International leg (Acorn Global)
  freight_tracking    text,
  freight_carrier     text default 'Acorn Global',
  freight_departed_at timestamptz,
  freight_arrived_at  timestamptz,

  -- UK leg (Shippo / Royal Mail / DPD)
  uk_tracking         text,
  uk_carrier          text,
  uk_label_url        text,
  uk_dispatched_at    timestamptz,
  delivered_at        timestamptz,

  admin_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table shipments is 'Three-leg tracking: Lagos (Sendbox), freight (Acorn Global), UK (Shippo).';
comment on column shipments.stage is 'Drives customer-facing order tracking page.';

create index idx_shipments_order_id on shipments(order_id);
create index idx_shipments_stage    on shipments(stage);

-- =============================================================================
-- 14. ESCROW LEDGER
-- One row per order_line. Holds funds for 21 days post-delivery.
-- Released by /api/cron (daily) when hold_until has passed and no open dispute.
-- =============================================================================

create table escrow_ledger (
  id              uuid primary key default gen_random_uuid(),
  order_line_id   uuid not null unique references order_lines(id) on delete restrict,
  brand_id        uuid not null references brands(id) on delete restrict,
  gross_gbp       numeric(10,2) not null,
  commission_gbp  numeric(10,2) not null,
  net_gbp         numeric(10,2) not null,
  commission_rate numeric(4,3) not null,      -- snapshot at time of order
  status          escrow_status not null default 'holding',
  hold_until      timestamptz,                -- delivered_at + 21 days
  released_at     timestamptz,
  payout_id       uuid,                       -- FK added after payouts table
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint escrow_net_positive check (net_gbp >= 0),
  constraint escrow_commission_valid check (commission_gbp >= 0)
);

comment on table escrow_ledger is 'Per-line escrow. Released by daily cron 21 days post-delivery if no dispute.';
comment on column escrow_ledger.commission_rate is 'Snapshot of brand.commission_rate at order time.';
comment on column escrow_ledger.hold_until is 'Set to order.delivered_at + 21 days by Stripe/Shippo webhook.';

create index idx_escrow_brand_id   on escrow_ledger(brand_id);
create index idx_escrow_status     on escrow_ledger(status);
create index idx_escrow_hold_until on escrow_ledger(hold_until)
  where status = 'holding';

-- =============================================================================
-- 15. PAYOUTS
-- One payout per settlement run per brand. May consolidate multiple escrow rows.
-- =============================================================================

create table payouts (
  id                  uuid primary key default gen_random_uuid(),
  brand_id            uuid not null references brands(id) on delete restrict,
  amount_gbp          numeric(10,2) not null,
  amount_ngn          numeric(14,2),
  fx_rate             numeric(10,4),               -- GBP/NGN at settlement
  flutterwave_ref     text unique,
  flutterwave_status  text,
  status              payout_status not null default 'pending',
  initiated_by        uuid references users(id),
  initiated_at        timestamptz not null default now(),
  settled_at          timestamptz,
  failure_reason      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table payouts is 'Flutterwave NGN settlements. One row per payout run per brand.';
comment on column payouts.fx_rate is 'GBP/NGN rate snapshot at time of settlement for reconciliation.';

create index idx_payouts_brand_id   on payouts(brand_id);
create index idx_payouts_status     on payouts(status);
create index idx_payouts_settled_at on payouts(settled_at desc);

-- Add FK from escrow_ledger to payouts now both tables exist
alter table escrow_ledger
  add constraint fk_escrow_payout
  foreign key (payout_id) references payouts(id);

create index idx_escrow_payout_id on escrow_ledger(payout_id);

-- =============================================================================
-- 16. DISPUTES
-- Customer-raised disputes within the 7-day window.
-- =============================================================================

create table disputes (
  id              uuid primary key default gen_random_uuid(),
  order_line_id   uuid not null references order_lines(id) on delete restrict,
  customer_id     uuid not null references customers(id) on delete restrict,
  tier            dispute_tier,
  status          dispute_status not null default 'open',
  description     text not null,
  evidence_urls   text[],
  admin_notes     text,
  refund_gbp      numeric(10,2),
  resolution      text,
  resolved_by     uuid references users(id),
  opened_at       timestamptz not null default now(),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table disputes is '7-day dispute window. tier set by admin: 1=partial, 2=credit, 3=full refund.';

create index idx_disputes_order_line_id on disputes(order_line_id);
create index idx_disputes_customer_id   on disputes(customer_id);
create index idx_disputes_status        on disputes(status);
create index idx_disputes_opened_at     on disputes(opened_at desc);

-- =============================================================================
-- 19. ABANDONED CARTS
-- =============================================================================

create table abandoned_carts (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid references customers(id) on delete set null,
  session_id      text,
  email           text not null,
  cart_snapshot   jsonb,
  recovery_stage  recovery_stage,
  last_sent_at    timestamptz,
  recovered       boolean not null default false,
  recovered_at    timestamptz,
  order_id        uuid references orders(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table abandoned_carts is '3-stage recovery: stage_1=1h, stage_2=24h, stage_3=72h. Skipped when recovered=true.';

create index idx_abandoned_carts_email       on abandoned_carts(email);
create index idx_abandoned_carts_customer_id on abandoned_carts(customer_id);
create index idx_abandoned_carts_recovered   on abandoned_carts(recovered)
  where recovered = false;
create index idx_abandoned_carts_last_sent   on abandoned_carts(last_sent_at)
  where recovered = false;

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

create trigger trg_brands_updated_at
  before update on brands
  for each row execute function set_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_variants_updated_at
  before update on variants
  for each row execute function set_updated_at();

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

create trigger trg_shipments_updated_at
  before update on shipments
  for each row execute function set_updated_at();

create trigger trg_escrow_updated_at
  before update on escrow_ledger
  for each row execute function set_updated_at();

create trigger trg_payouts_updated_at
  before update on payouts
  for each row execute function set_updated_at();

create trigger trg_disputes_updated_at
  before update on disputes
  for each row execute function set_updated_at();

create trigger trg_gift_cards_updated_at
  before update on gift_cards
  for each row execute function set_updated_at();

create trigger trg_abandoned_carts_updated_at
  before update on abandoned_carts
  for each row execute function set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table users              enable row level security;
alter table customers          enable row level security;
alter table addresses          enable row level security;
alter table brand_applications enable row level security;
alter table brands             enable row level security;
alter table products           enable row level security;
alter table variants           enable row level security;
alter table bag                enable row level security;
alter table wishlist           enable row level security;
alter table orders             enable row level security;
alter table order_lines        enable row level security;
alter table reviews            enable row level security;
alter table shipments          enable row level security;
alter table escrow_ledger      enable row level security;
alter table payouts            enable row level security;
alter table disputes           enable row level security;
alter table discount_codes     enable row level security;
alter table gift_cards         enable row level security;
alter table abandoned_carts    enable row level security;

-- Helper: current user's UUID from users table
create or replace function auth_user_id()
returns uuid language sql stable as $$
  select id from users where auth_id = auth.uid()
$$;

-- Helper: current user's role
create or replace function auth_user_role()
returns user_role language sql stable as $$
  select role from users where auth_id = auth.uid()
$$;

-- Helper: current user's brand_id (for seller policies)
create or replace function auth_brand_id()
returns uuid language sql stable as $$
  select id from brands where user_id = auth_user_id()
$$;

-- ── USERS ────────────────────────────────────────────────────────────────────
create policy "users: own row" on users
  for all using (auth_id = auth.uid());

create policy "users: admin all" on users
  for all using (auth_user_role() = 'admin');

-- ── CUSTOMERS ────────────────────────────────────────────────────────────────
create policy "customers: own row" on customers
  for all using (user_id = auth_user_id());

create policy "customers: admin all" on customers
  for all using (auth_user_role() = 'admin');

-- ── ADDRESSES ────────────────────────────────────────────────────────────────
create policy "addresses: own rows" on addresses
  for all using (
    customer_id in (select id from customers where user_id = auth_user_id())
  );

create policy "addresses: admin all" on addresses
  for all using (auth_user_role() = 'admin');

-- ── BRAND APPLICATIONS ───────────────────────────────────────────────────────
create policy "brand_applications: admin all" on brand_applications
  for all using (auth_user_role() = 'admin');

-- ── BRANDS ───────────────────────────────────────────────────────────────────
create policy "brands: public read approved" on brands
  for select using (status = 'approved');

create policy "brands: seller own row" on brands
  for all using (user_id = auth_user_id());

create policy "brands: admin all" on brands
  for all using (auth_user_role() = 'admin');

-- ── PRODUCTS ─────────────────────────────────────────────────────────────────
create policy "products: public read active" on products
  for select using (status = 'active');

create policy "products: seller own brand" on products
  for all using (brand_id = auth_brand_id());

create policy "products: admin all" on products
  for all using (auth_user_role() = 'admin');

-- ── VARIANTS ─────────────────────────────────────────────────────────────────
create policy "variants: public read" on variants
  for select using (
    product_id in (select id from products where status = 'active')
  );

create policy "variants: seller own brand" on variants
  for all using (
    product_id in (select id from products where brand_id = auth_brand_id())
  );

create policy "variants: admin all" on variants
  for all using (auth_user_role() = 'admin');

-- ── BAG ──────────────────────────────────────────────────────────────────────
create policy "bag: own rows" on bag
  for all using (
    customer_id in (select id from customers where user_id = auth_user_id())
  );

create policy "bag: admin all" on bag
  for all using (auth_user_role() = 'admin');

-- ── WISHLIST ─────────────────────────────────────────────────────────────────
create policy "wishlist: own rows" on wishlist
  for all using (
    customer_id in (select id from customers where user_id = auth_user_id())
  );

-- ── ORDERS ───────────────────────────────────────────────────────────────────
create policy "orders: own rows" on orders
  for select using (
    customer_id in (select id from customers where user_id = auth_user_id())
  );

create policy "orders: admin all" on orders
  for all using (auth_user_role() = 'admin');

-- ── ORDER LINES ──────────────────────────────────────────────────────────────
create policy "order_lines: customer own orders" on order_lines
  for select using (
    order_id in (
      select id from orders
      where customer_id in (select id from customers where user_id = auth_user_id())
    )
  );

create policy "order_lines: seller own brand" on order_lines
  for select using (brand_id = auth_brand_id());

create policy "order_lines: admin all" on order_lines
  for all using (auth_user_role() = 'admin');

-- ── SHIPMENTS ────────────────────────────────────────────────────────────────
create policy "shipments: customer own orders" on shipments
  for select using (
    order_id in (
      select id from orders
      where customer_id in (select id from customers where user_id = auth_user_id())
    )
  );

create policy "shipments: admin all" on shipments
  for all using (auth_user_role() = 'admin');

-- ── ESCROW LEDGER ────────────────────────────────────────────────────────────
create policy "escrow_ledger: seller own brand" on escrow_ledger
  for select using (brand_id = auth_brand_id());

create policy "escrow_ledger: admin all" on escrow_ledger
  for all using (auth_user_role() = 'admin');

-- ── PAYOUTS ──────────────────────────────────────────────────────────────────
create policy "payouts: seller own brand" on payouts
  for select using (brand_id = auth_brand_id());

create policy "payouts: admin all" on payouts
  for all using (auth_user_role() = 'admin');

-- ── DISPUTES ─────────────────────────────────────────────────────────────────
create policy "disputes: customer own" on disputes
  for all using (
    customer_id in (select id from customers where user_id = auth_user_id())
  );

create policy "disputes: admin all" on disputes
  for all using (auth_user_role() = 'admin');

-- ── REVIEWS ──────────────────────────────────────────────────────────────────
create policy "reviews: public read published" on reviews
  for select using (status = 'published');

create policy "reviews: customer own" on reviews
  for all using (
    customer_id in (select id from customers where user_id = auth_user_id())
  );

create policy "reviews: admin all" on reviews
  for all using (auth_user_role() = 'admin');

-- ── DISCOUNT CODES ───────────────────────────────────────────────────────────
create policy "discount_codes: authenticated read active" on discount_codes
  for select using (active = true and auth.uid() is not null);

create policy "discount_codes: admin all" on discount_codes
  for all using (auth_user_role() = 'admin');

-- ── GIFT CARDS ───────────────────────────────────────────────────────────────
create policy "gift_cards: customer own" on gift_cards
  for select using (
    issued_to in (select id from customers where user_id = auth_user_id())
  );

create policy "gift_cards: admin all" on gift_cards
  for all using (auth_user_role() = 'admin');

-- ── ABANDONED CARTS ──────────────────────────────────────────────────────────
create policy "abandoned_carts: admin all" on abandoned_carts
  for all using (auth_user_role() = 'admin');

-- =============================================================================
-- VIEWS
-- =============================================================================

create or replace view v_brand_pending_payouts as
select
  b.id            as brand_id,
  b.name          as brand_name,
  count(el.id)    as lines_count,
  sum(el.net_gbp) as total_pending_gbp
from escrow_ledger el
join brands b on b.id = el.brand_id
where el.status = 'holding'
  and el.hold_until <= now()
  and not exists (
    select 1 from disputes d
    where d.order_line_id = el.order_line_id
      and d.status not in ('resolved')
  )
group by b.id, b.name;

comment on view v_brand_pending_payouts is 'Escrow rows ready for payout: hold_until passed, no open disputes.';

create or replace view v_order_tracking as
select
  o.id                       as order_id,
  o.status                   as order_status,
  o.placed_at,
  o.delivered_at,
  o.dispute_window_closes_at,
  s.stage                    as shipment_stage,
  s.lagos_tracking,
  s.lagos_carrier,
  s.lagos_dispatched_at,
  s.freight_tracking,
  s.freight_carrier,
  s.freight_departed_at,
  s.freight_arrived_at,
  s.uk_tracking,
  s.uk_carrier,
  s.uk_dispatched_at,
  s.delivered_at             as shipment_delivered_at
from orders o
left join shipments s on s.order_id = o.id;

comment on view v_order_tracking is 'Joined order + shipment for customer-facing tracking page.';

-- =============================================================================
-- SEED: ADMIN USER ROLE HELPER
-- Replace <your-auth-uid> with the UUID from auth.users.
-- =============================================================================

-- insert into users (auth_id, email, full_name, role)
-- values ('<your-auth-uid>', 'admin@theasofe.com', 'Asofe Admin', 'admin');

-- =============================================================================
-- END OF MIGRATION
-- Tables: 19  |  Enums: 14  |  Indexes: 42  |  Triggers: 12
-- RLS policies: 35  |  Views: 2  |  Helper functions: 3
-- =============================================================================
