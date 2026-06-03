-- Asofe: marketplace schema
-- Idempotent: safe to re-run.

-- ─── Domain tables ─────────────────────────────────────────────────────────

create table if not exists public.categories (
  slug         text primary key,
  name         text not null,
  description  text not null,
  hero_image   text not null,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.brands (
  slug         text primary key,
  name         text not null,
  tagline      text not null,
  founded      text not null,
  origin       text not null,
  story        text not null,
  hero_image   text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.sellers (
  slug         text primary key,
  name         text not null,
  type         text not null check (type in ('Maison','Atelier','Independent','Archive')),
  location     text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.products (
  slug         text primary key,
  name         text not null,
  brand        text not null references public.brands(slug) on delete restrict,
  seller       text not null references public.sellers(slug) on delete restrict,
  category     text not null references public.categories(slug) on delete restrict,
  subcategory  text,
  price        int  not null check (price >= 0),
  currency     text not null default 'GBP' check (currency = 'GBP'),
  description  text not null,
  composition  text[] not null default '{}',
  made_in      text not null,
  sizes        text[] not null default '{}',
  colour       text not null,
  images       text[] not null default '{}',
  new_arrival  boolean not null default false,
  featured     boolean not null default false,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_brand_idx    on public.products(brand);
create index if not exists products_category_idx on public.products(category);

-- Phase 4: made-to-order / backorders. When `made_to_order` is true, the product
-- can be added to the bag even when its size has zero in-stock. `lead_time_weeks`
-- is shown to the customer at point of purchase and snapshotted to order_items.
alter table public.products
  add column if not exists made_to_order   boolean not null default false,
  add column if not exists lead_time_weeks int;

-- ─── Auth-bound tables ─────────────────────────────────────────────────────

-- profiles: 1:1 with auth.users, holds role + assigned brand
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null default 'visitor' check (role in ('visitor','seller','admin')),
  brand       text references public.brands(slug) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── Phase 1: stock + orders ───────────────────────────────────────────────

create table if not exists public.stock_levels (
  product_slug text not null references public.products(slug) on delete cascade,
  size         text not null,
  quantity     int  not null default 0 check (quantity >= 0),
  updated_at   timestamptz not null default now(),
  primary key (product_slug, size)
);

create index if not exists stock_levels_product_idx on public.stock_levels(product_slug);

-- Stock mutation helpers invoked from the Stripe webhook. Run with the row's
-- owner permissions (definer) and floor at zero so we can't go negative.
create or replace function public.decrement_stock(p_slug text, p_size text, p_qty int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stock_levels
     set quantity = greatest(0, quantity - p_qty),
         updated_at = now()
   where product_slug = p_slug and size = p_size;
$$;

create or replace function public.increment_stock(p_slug text, p_size text, p_qty int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stock_levels
     set quantity = quantity + p_qty,
         updated_at = now()
   where product_slug = p_slug and size = p_size;
$$;

-- Phase 6: variants. Add `colour` to stock_levels and re-key the table so a
-- single product can carry stock across multiple (colour, size) pairs.
-- Backfill colour for existing rows from the product's default colour.
alter table public.products
  add column if not exists colours text[];

alter table public.stock_levels
  add column if not exists colour text;

-- Backfill: copy product.colour onto any stock_levels row missing a colour
update public.stock_levels sl
   set colour = coalesce(p.colour, '')
  from public.products p
 where sl.product_slug = p.slug
   and (sl.colour is null or sl.colour = '');

alter table public.stock_levels
  alter column colour set default '',
  alter column colour set not null;

-- Swap the PK from (product_slug, size) → (product_slug, colour, size). Done
-- inside a DO block so the migration stays idempotent.
do $$
declare
  pk_includes_colour boolean;
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'stock_levels_pkey'
      and conrelid = 'public.stock_levels'::regclass
  ) then
    select bool_or(a.attname = 'colour') into pk_includes_colour
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conname = 'stock_levels_pkey';

    if not coalesce(pk_includes_colour, false) then
      alter table public.stock_levels drop constraint stock_levels_pkey;
      alter table public.stock_levels add primary key (product_slug, colour, size);
    end if;
  end if;
end $$;

-- Variant-aware stock RPCs. Old single-arg signature is replaced — callers
-- pass colour through, falling back to '' for single-colour products.
create or replace function public.decrement_stock(p_slug text, p_colour text, p_size text, p_qty int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stock_levels
     set quantity = greatest(0, quantity - p_qty),
         updated_at = now()
   where product_slug = p_slug
     and colour = coalesce(p_colour, '')
     and size = p_size;
$$;

create or replace function public.increment_stock(p_slug text, p_colour text, p_size text, p_qty int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stock_levels
     set quantity = quantity + p_qty,
         updated_at = now()
   where product_slug = p_slug
     and colour = coalesce(p_colour, '')
     and size = p_size;
$$;

-- Snapshot the chosen colour on the order line so historical orders stay
-- accurate even if the product's variants change later.
alter table public.order_items
  add column if not exists colour text;

-- Addresses can belong to a customer (auth user) or be one-off for guest orders.
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  full_name   text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  postcode    text not null,
  country     text not null default 'United Kingdom',
  phone       text,
  created_at  timestamptz not null default now()
);

create index if not exists addresses_customer_idx on public.addresses(customer_id);

-- Orders. customer_id is nullable for guest checkout; customer_email always set.
create table if not exists public.orders (
  id                       uuid primary key default gen_random_uuid(),
  customer_id              uuid references auth.users(id) on delete set null,
  customer_email           text not null,
  shipping_address_id      uuid references public.addresses(id) on delete restrict,
  status                   text not null default 'pending'
                             check (status in ('pending','paid','packed','dispatched','delivered','cancelled','refunded')),
  subtotal                 int  not null check (subtotal >= 0),
  shipping                 int  not null default 0 check (shipping >= 0),
  total                    int  not null check (total >= 0),
  currency                 text not null default 'GBP' check (currency = 'GBP'),
  stripe_payment_intent_id text,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_status_idx   on public.orders(status);

-- Per-status timestamps + outbound courier tracking. Lets the customer
-- order-tracking page render an audit-quality timeline ("Paid 20 May ·
-- Packed 21 May · Dispatched 22 May") and a clickable courier link.
alter table public.orders
  add column if not exists paid_at         timestamptz,
  add column if not exists packed_at       timestamptz,
  add column if not exists dispatched_at   timestamptz,
  add column if not exists delivered_at    timestamptz,
  add column if not exists cancelled_at    timestamptz,
  add column if not exists courier         text,
  add column if not exists tracking_ref    text,
  add column if not exists tracking_url    text,
  add column if not exists eta_date        date,
  -- Post-delivery review-prompt cron; set when notifyReviewPrompt fires so
  -- the daily job is idempotent.
  add column if not exists review_prompt_sent_at timestamptz,
  -- Outbound courier label: populated by lib/courier when the admin buys a
  -- shipping label. provider="shippo"/"stub" + parcel_id let the tracking
  -- webhook correlate incoming events back to the order.
  add column if not exists label_url            text,
  add column if not exists label_provider       text,
  add column if not exists label_parcel_id      text,
  add column if not exists label_cost_pence     int,
  add column if not exists label_created_at     timestamptz;

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete restrict,
  brand_slug   text not null,
  name         text not null,
  size         text not null,
  qty          int  not null check (qty > 0),
  unit_price   int  not null check (unit_price >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists order_items_order_idx   on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_slug);
create index if not exists order_items_brand_idx   on public.order_items(brand_slug);

-- Phase 4: snapshot the lead time at order time so a later product change
-- doesn't rewrite history for an in-flight order. Null = in-stock at order.
alter table public.order_items
  add column if not exists lead_time_weeks int;

-- RLS for Phase 1 tables
alter table public.stock_levels enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;
alter table public.addresses    enable row level security;

-- Stock is public-readable (so the catalogue can show "in stock" / "out of stock").
drop policy if exists "public read stock" on public.stock_levels;
create policy "public read stock" on public.stock_levels for select using (true);

drop policy if exists "seller writes own stock" on public.stock_levels;
create policy "seller writes own stock" on public.stock_levels
  for all
  using (exists (
    select 1 from public.products p
    where p.slug = stock_levels.product_slug
      and p.brand = public.current_brand()
  ))
  with check (exists (
    select 1 from public.products p
    where p.slug = stock_levels.product_slug
      and p.brand = public.current_brand()
  ));

drop policy if exists "admin writes stock" on public.stock_levels;
create policy "admin writes stock" on public.stock_levels
  for all using (public.is_admin()) with check (public.is_admin());

-- Orders / items / addresses RLS.
drop policy if exists "admin reads orders"      on public.orders;
drop policy if exists "admin reads items"       on public.order_items;
drop policy if exists "admin reads addresses"   on public.addresses;
drop policy if exists "customer reads own orders"     on public.orders;
drop policy if exists "customer reads own items"      on public.order_items;
drop policy if exists "customer reads own addresses"  on public.addresses;
drop policy if exists "customer writes own addresses" on public.addresses;
drop policy if exists "seller reads brand items"      on public.order_items;

create policy "admin reads orders"    on public.orders      for select using (public.is_admin());
create policy "admin reads items"     on public.order_items for select using (public.is_admin());
create policy "admin reads addresses" on public.addresses   for select using (public.is_admin());

-- Customers see only their own orders / items / addresses.
create policy "customer reads own orders" on public.orders for select
  using (customer_id = auth.uid());

create policy "customer reads own items" on public.order_items for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.customer_id = auth.uid()
  ));

create policy "customer reads own addresses" on public.addresses for select
  using (customer_id = auth.uid());

create policy "customer writes own addresses" on public.addresses for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- Sellers see order items for their brand (so the /dashboard/orders view works without service-role).
create policy "seller reads brand items" on public.order_items for select
  using (brand_slug = public.current_brand());

-- ─── Phase 2: shipments (Nigeria → UK consignments) ────────────────────────

create table if not exists public.shipments (
  id                uuid primary key default gen_random_uuid(),
  brand             text not null references public.brands(slug) on delete restrict,
  status            text not null default 'awaiting_dispatch'
                      check (status in ('awaiting_dispatch','in_transit','customs','arrived','inducted','cancelled')),
  freight_partner   text,
  tracking_ref      text,
  expected_arrival  date,
  received_at       timestamptz,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists shipments_brand_idx  on public.shipments(brand);
create index if not exists shipments_status_idx on public.shipments(status);

create table if not exists public.shipment_items (
  id            uuid primary key default gen_random_uuid(),
  shipment_id   uuid not null references public.shipments(id) on delete cascade,
  product_slug  text not null references public.products(slug) on delete restrict,
  size          text not null,
  qty           int  not null check (qty > 0),       -- planned at dispatch
  received_qty  int  check (received_qty >= 0)        -- set at induction; may differ
);

create index if not exists shipment_items_shipment_idx on public.shipment_items(shipment_id);

-- Customs declaration metadata for HMRC commercial invoice.
-- HS codes default by product category if not specified per-line; designer
-- can override on a row-by-row basis from the admin UI.
alter table public.shipment_items
  add column if not exists hs_code             text,
  add column if not exists declared_unit_value int,                 -- pence, GBP, per piece
  add column if not exists country_of_origin   text,                -- ISO-3166 alpha-2
  add column if not exists weight_grams        int,                 -- per piece
  add column if not exists customs_description text;                -- plain-English line item description

alter table public.shipments
  add column if not exists invoice_number      text,                -- "ASF-2026-001"
  add column if not exists incoterm            text default 'DDP',  -- DDP / DAP / EXW etc.
  add column if not exists consignor_address   text,                -- designer pickup address
  add column if not exists commercial_purpose  text default 'Sale of goods';

alter table public.shipments      enable row level security;
alter table public.shipment_items enable row level security;

drop policy if exists "admin reads shipments"  on public.shipments;
drop policy if exists "admin writes shipments" on public.shipments;
drop policy if exists "seller reads own shipments" on public.shipments;

create policy "admin reads shipments"  on public.shipments for select using (public.is_admin());
create policy "admin writes shipments" on public.shipments for all
  using (public.is_admin()) with check (public.is_admin());
create policy "seller reads own shipments" on public.shipments for select
  using (brand = public.current_brand());

drop policy if exists "admin reads shipment items"  on public.shipment_items;
drop policy if exists "admin writes shipment items" on public.shipment_items;
drop policy if exists "seller reads own shipment items" on public.shipment_items;

create policy "admin reads shipment items"  on public.shipment_items for select using (public.is_admin());
create policy "admin writes shipment items" on public.shipment_items for all
  using (public.is_admin()) with check (public.is_admin());
create policy "seller reads own shipment items" on public.shipment_items for select
  using (exists (
    select 1 from public.shipments s
    where s.id = shipment_items.shipment_id and s.brand = public.current_brand()
  ));

-- ─── Phase 2: editorial CMS ────────────────────────────────────────────────

-- Single row of site-wide settings as JSONB. Whole-row swap keeps the editor
-- transactional and avoids the complexity of per-key tables for an MVP.
create table if not exists public.site_settings (
  id          int  primary key default 1 check (id = 1),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

create table if not exists public.journal_posts (
  slug         text primary key,
  title        text not null,
  eyebrow      text,
  excerpt      text,
  body         text not null,
  hero_image   text not null,
  brand        text references public.brands(slug) on delete set null,
  published    boolean not null default false,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists journal_posts_published_idx on public.journal_posts(published, published_at);

alter table public.site_settings enable row level security;
alter table public.journal_posts enable row level security;

drop policy if exists "public reads site settings" on public.site_settings;
create policy "public reads site settings" on public.site_settings for select using (true);

drop policy if exists "admin writes site settings" on public.site_settings;
create policy "admin writes site settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads published journal" on public.journal_posts;
create policy "public reads published journal" on public.journal_posts for select
  using (published or public.is_admin());

drop policy if exists "admin writes journal" on public.journal_posts;
create policy "admin writes journal" on public.journal_posts for all using (public.is_admin()) with check (public.is_admin());

-- ─── Phase 1: product image storage ───────────────────────────────────────

-- Public 'product-images' bucket. Sellers upload to `{their-brand}/...`;
-- admins can write anywhere. Anyone may read (catalogue is public).
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "public reads product images"    on storage.objects;
drop policy if exists "seller writes own brand images" on storage.objects;
drop policy if exists "admin writes any product image" on storage.objects;

create policy "public reads product images" on storage.objects
  for select using (bucket_id = 'product-images');

-- Path convention: `{brand-slug}/{anything}` — sellers may only touch their own folder.
create policy "seller writes own brand images" on storage.objects
  for all
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = public.current_brand()
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = public.current_brand()
  );

create policy "admin writes any product image" on storage.objects
  for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- ─── Phase 3: admin-managed site image storage ────────────────────────────

-- Public 'site-images' bucket for CMS hero/journal, brand heroes, journal post
-- heroes — anything an admin uploads via /admin/*. Admin-only write.
insert into storage.buckets (id, name, public)
  values ('site-images', 'site-images', true)
  on conflict (id) do update set public = excluded.public;

drop policy if exists "public reads site images" on storage.objects;
drop policy if exists "admin writes site images" on storage.objects;

create policy "public reads site images" on storage.objects
  for select using (bucket_id = 'site-images');

create policy "admin writes site images" on storage.objects
  for all
  using (bucket_id = 'site-images' and public.is_admin())
  with check (bucket_id = 'site-images' and public.is_admin());

-- ─── Phase 5: newsletter subscriptions ─────────────────────────────────────

create table if not exists public.newsletter_subscribers (
  email        text primary key,
  source       text,                  -- which page / context produced the signup
  created_at   timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "anyone subscribes"          on public.newsletter_subscribers;
drop policy if exists "admin reads subscribers"    on public.newsletter_subscribers;

create policy "anyone subscribes" on public.newsletter_subscribers
  for insert
  to public
  with check (true);

create policy "admin reads subscribers" on public.newsletter_subscribers
  for select using (public.is_admin());

-- ─── Phase 4: wishlist (favourites) ────────────────────────────────────────

create table if not exists public.wishlist (
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, product_slug)
);

create index if not exists wishlist_user_idx on public.wishlist(user_id);

alter table public.wishlist enable row level security;

drop policy if exists "user reads own wishlist"  on public.wishlist;
drop policy if exists "user writes own wishlist" on public.wishlist;

create policy "user reads own wishlist" on public.wishlist
  for select using (user_id = auth.uid());

create policy "user writes own wishlist" on public.wishlist
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── (existing) applications: seller onboarding submissions ────────────────
-- applications: seller onboarding submissions
create table if not exists public.applications (
  id                         uuid primary key default gen_random_uuid(),
  brand_name                 text not null,
  founder_name               text not null,
  instagram_handle           text not null,
  product_category           text not null,
  monthly_inventory_estimate text not null,
  whatsapp_number            text not null,
  website                    text,
  status                     text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by                uuid references auth.users(id) on delete set null,
  reviewed_at                timestamptz,
  created_at                 timestamptz not null default now()
);

-- Phase 3: link applications to the auth account created at sign-up so the
-- applicant can see their status on /dashboard, and admin approval can flip
-- their role without manual user-lookup.
alter table public.applications
  add column if not exists applicant_user_id uuid references auth.users(id) on delete set null,
  add column if not exists applicant_email   text;

create index if not exists applications_status_idx          on public.applications(status);
create index if not exists applications_applicant_user_idx  on public.applications(applicant_user_id);

-- ─── Auto-create a profile row when a user signs up ────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.email = 'abiola.akinwale@googlemail.com' then 'admin' else 'visitor' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row-level security ────────────────────────────────────────────────────

alter table public.categories    enable row level security;
alter table public.brands        enable row level security;
alter table public.sellers       enable row level security;
alter table public.products      enable row level security;
alter table public.profiles      enable row level security;
alter table public.applications  enable row level security;

-- Helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_brand()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select brand from public.profiles where id = auth.uid();
$$;

-- Catalog reads: public can read everything published
drop policy if exists "public read categories"  on public.categories;
drop policy if exists "public read brands"      on public.brands;
drop policy if exists "public read sellers"     on public.sellers;
drop policy if exists "public read products"    on public.products;

create policy "public read categories" on public.categories for select using (true);
create policy "public read brands"     on public.brands     for select using (true);
create policy "public read sellers"    on public.sellers    for select using (true);
create policy "public read products"   on public.products   for select using (published or public.is_admin() or brand = public.current_brand());

-- Product writes: sellers can write own brand; admins write anything
drop policy if exists "seller writes own brand products" on public.products;
drop policy if exists "admin writes products"            on public.products;

create policy "seller writes own brand products" on public.products
  for all
  using (brand = public.current_brand())
  with check (brand = public.current_brand());

create policy "admin writes products" on public.products
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Brand writes: admins only (seller's brand row is created on approval)
drop policy if exists "admin writes brands" on public.brands;
create policy "admin writes brands" on public.brands
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin writes sellers" on public.sellers;
create policy "admin writes sellers" on public.sellers
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin writes categories" on public.categories;
create policy "admin writes categories" on public.categories
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Profiles: user reads own; admin reads all; user updates own (but not role/brand)
drop policy if exists "profile self read"  on public.profiles;
drop policy if exists "admin reads profiles" on public.profiles;
drop policy if exists "admin writes profiles" on public.profiles;

create policy "profile self read" on public.profiles
  for select using (id = auth.uid());
create policy "admin reads profiles" on public.profiles
  for select using (public.is_admin());
create policy "admin writes profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- Applications: anonymous can insert; only admin can read/update; the applicant
-- themselves can read their own row (to show status on /dashboard).
drop policy if exists "anyone applies"                  on public.applications;
drop policy if exists "admin reads applications"        on public.applications;
drop policy if exists "admin updates applications"      on public.applications;
drop policy if exists "applicant reads own application" on public.applications;

create policy "anyone applies" on public.applications
  for insert
  to public
  with check (true);

create policy "admin reads applications" on public.applications
  for select using (public.is_admin());

create policy "admin updates applications" on public.applications
  for update using (public.is_admin()) with check (public.is_admin());

create policy "applicant reads own application" on public.applications
  for select using (applicant_user_id = auth.uid());

-- ─── Returns ─────────────────────────────────────────────────────────────────
-- Customer-initiated returns. Each return covers ≥1 line item from one order.
-- Refunds are processed via Stripe; the Stripe webhook handler short-circuits
-- when orders.status is already 'refunded' so we don't double-restock.
create table if not exists public.returns (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  customer_id       uuid not null references auth.users(id) on delete restrict,
  rma_number        text not null unique,                -- short e.g. R-A4F7B2
  status            text not null default 'requested'
                      check (status in ('requested','approved','received','refunded','rejected','cancelled')),
  reason            text not null
                      check (reason in ('sizing','quality','not_as_described','arrived_damaged','wrong_item','changed_mind','other')),
  customer_note     text,
  admin_note        text,
  refund_amount     int,                                 -- pence; populated when refunded
  refund_currency   text not null default 'GBP',
  stripe_refund_id  text,
  initiated_at      timestamptz not null default now(),
  received_at       timestamptz,
  refunded_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists returns_order_idx    on public.returns(order_id);
create index if not exists returns_customer_idx on public.returns(customer_id);
create index if not exists returns_status_idx   on public.returns(status);

create table if not exists public.return_items (
  id              uuid primary key default gen_random_uuid(),
  return_id       uuid not null references public.returns(id) on delete cascade,
  order_item_id   uuid not null references public.order_items(id) on delete restrict,
  qty             int  not null check (qty > 0),
  restock         boolean not null default true,         -- false if QC fails
  created_at      timestamptz not null default now()
);

create index if not exists return_items_return_idx on public.return_items(return_id);

alter table public.returns       enable row level security;
alter table public.return_items  enable row level security;

drop policy if exists "customer reads own returns"   on public.returns;
drop policy if exists "customer inserts own returns" on public.returns;
drop policy if exists "admin reads all returns"      on public.returns;
drop policy if exists "admin updates returns"        on public.returns;

create policy "customer reads own returns" on public.returns
  for select using (customer_id = auth.uid());

create policy "customer inserts own returns" on public.returns
  for insert with check (customer_id = auth.uid());

create policy "admin reads all returns" on public.returns
  for select using (public.is_admin());

create policy "admin updates returns" on public.returns
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer reads own return items"   on public.return_items;
drop policy if exists "customer inserts own return items" on public.return_items;
drop policy if exists "admin reads all return items"      on public.return_items;
drop policy if exists "admin updates return items"        on public.return_items;

create policy "customer reads own return items" on public.return_items
  for select using (exists (select 1 from public.returns r where r.id = return_id and r.customer_id = auth.uid()));

create policy "customer inserts own return items" on public.return_items
  for insert with check (exists (select 1 from public.returns r where r.id = return_id and r.customer_id = auth.uid()));

create policy "admin reads all return items" on public.return_items
  for select using (public.is_admin());

create policy "admin updates return items" on public.return_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── Designer payouts ────────────────────────────────────────────────────────
-- Marketplace flow: customer pays Stripe → Stripe pays Asofe → Asofe pays
-- designer their share (after commission). This is the reconciliation layer:
-- a "payout" groups all eligible order lines for one brand over one period,
-- applies the brand's commission rate, and tracks the manual settlement.

alter table public.brands
  add column if not exists commission_rate numeric(4,3) not null default 0.300
    check (commission_rate >= 0 and commission_rate <= 1);

-- Stamp set by the monthly-recap cron so a re-run on the same calendar month
-- doesn't double-send to designers. Reset by simply nulling the column.
alter table public.brands
  add column if not exists last_recap_sent_at timestamptz;

create table if not exists public.payouts (
  id                  uuid primary key default gen_random_uuid(),
  brand               text not null references public.brands(slug) on delete restrict,
  status              text not null default 'draft'
                        check (status in ('draft','sent','paid','cancelled')),
  period_start        date not null,
  period_end          date not null,
  gross_total         int  not null default 0,              -- pence; sum of lines.gross
  refund_total        int  not null default 0,              -- pence; refunded amount within period
  commission_amount   int  not null default 0,              -- pence; Asofe's cut
  net_amount          int  not null default 0,              -- pence; what's owed to the brand
  currency            text not null default 'GBP',
  paid_via            text,                                 -- "Wise", "Bank transfer", etc.
  paid_ref            text,                                 -- transaction reference
  paid_at             timestamptz,
  sent_at             timestamptz,                          -- when statement was emailed to brand
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (period_end >= period_start)
);

create index if not exists payouts_brand_idx  on public.payouts(brand);
create index if not exists payouts_status_idx on public.payouts(status);
create index if not exists payouts_period_idx on public.payouts(period_start, period_end);

create table if not exists public.payout_lines (
  id                  uuid primary key default gen_random_uuid(),
  payout_id           uuid not null references public.payouts(id) on delete cascade,
  order_id            uuid not null references public.orders(id) on delete restrict,
  order_item_id       uuid not null references public.order_items(id) on delete restrict,
  product_slug        text not null,
  product_name        text not null,
  qty                 int  not null,
  unit_price          int  not null,
  gross_amount        int  not null,                        -- qty × unit_price (positive)
  refund_amount       int  not null default 0,              -- positive number; subtracted from gross
  commission_rate     numeric(4,3) not null,
  net_amount          int  not null,                        -- (gross - refund) × (1 - commission_rate)
  created_at          timestamptz not null default now()
);

create index if not exists payout_lines_payout_idx on public.payout_lines(payout_id);

alter table public.payouts      enable row level security;
alter table public.payout_lines enable row level security;

drop policy if exists "seller reads own payouts"      on public.payouts;
drop policy if exists "admin reads all payouts"       on public.payouts;
drop policy if exists "admin writes payouts"          on public.payouts;
drop policy if exists "seller reads own payout lines" on public.payout_lines;
drop policy if exists "admin reads all payout lines"  on public.payout_lines;
drop policy if exists "admin writes payout lines"     on public.payout_lines;

create policy "seller reads own payouts" on public.payouts
  for select using (brand = public.current_brand());
create policy "admin reads all payouts" on public.payouts
  for select using (public.is_admin());
create policy "admin writes payouts" on public.payouts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "seller reads own payout lines" on public.payout_lines
  for select using (
    exists (select 1 from public.payouts p where p.id = payout_id and p.brand = public.current_brand())
  );
create policy "admin reads all payout lines" on public.payout_lines
  for select using (public.is_admin());
create policy "admin writes payout lines" on public.payout_lines
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── Audit log ───────────────────────────────────────────────────────────────
-- Every admin write that changes important state lands here. Denormalised
-- actor_email so the entry survives auth.users deletion. Append-only —
-- there's no UPDATE/DELETE policy, only INSERT (via service role) and
-- SELECT (admin only).
create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users(id) on delete set null,
  actor_email  text,
  action       text not null,                  -- e.g. "order.status_changed"
  target_type  text,                            -- "order" | "return" | "payout" | "brand" | ...
  target_id    text,                            -- uuid or slug as text
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_actor_idx   on public.audit_log(actor_id);
create index if not exists audit_log_target_idx  on public.audit_log(target_type, target_id);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);
create index if not exists audit_log_action_idx  on public.audit_log(action);

alter table public.audit_log enable row level security;

drop policy if exists "admin reads audit log" on public.audit_log;
create policy "admin reads audit log" on public.audit_log
  for select using (public.is_admin());
-- Intentionally no INSERT/UPDATE/DELETE policy: writes happen via service
-- role from lib/audit.ts logAction(), and no path mutates rows after
-- creation. RLS denies everything else.

-- ─── Reviews ─────────────────────────────────────────────────────────────────
-- Verified-purchase product reviews. The (customer, product, order) triple is
-- unique so a customer can review the same piece across separate orders but
-- not multiple times for one order. brand_slug is denormalised for fast
-- brand-aggregate queries on the public site.
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references auth.users(id) on delete cascade,
  product_slug  text not null references public.products(slug) on delete cascade,
  brand_slug    text not null references public.brands(slug) on delete cascade,
  order_id      uuid not null references public.orders(id) on delete restrict,
  rating        int  not null check (rating between 1 and 5),
  title         text,
  body          text,
  status        text not null default 'published'
                  check (status in ('published','hidden','flagged')),
  customer_name text,                                     -- snapshot of display name at write time
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (customer_id, product_slug, order_id)
);

create index if not exists reviews_product_idx  on public.reviews(product_slug, status);
create index if not exists reviews_brand_idx    on public.reviews(brand_slug, status);
create index if not exists reviews_customer_idx on public.reviews(customer_id);

alter table public.reviews enable row level security;

drop policy if exists "anyone reads published reviews" on public.reviews;
drop policy if exists "customer reads own reviews"     on public.reviews;
drop policy if exists "customer writes own reviews"    on public.reviews;
drop policy if exists "customer updates own reviews"   on public.reviews;
drop policy if exists "admin reads all reviews"        on public.reviews;
drop policy if exists "admin updates reviews"          on public.reviews;

create policy "anyone reads published reviews" on public.reviews
  for select using (status = 'published');

create policy "customer reads own reviews" on public.reviews
  for select using (customer_id = auth.uid());

create policy "customer writes own reviews" on public.reviews
  for insert with check (customer_id = auth.uid());

create policy "customer updates own reviews" on public.reviews
  for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());

create policy "admin reads all reviews" on public.reviews
  for select using (public.is_admin());

create policy "admin updates reviews" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── Designer Q&A ────────────────────────────────────────────────────────────
-- Customer questions on a product, answered by the seller. Once answered the
-- thread is public on the product page — future buyers benefit from the
-- previous one's question. brand_slug denormalised so the seller can list
-- all their pending threads cheaply.
create table if not exists public.designer_questions (
  id              uuid primary key default gen_random_uuid(),
  product_slug    text not null references public.products(slug) on delete cascade,
  brand_slug      text not null references public.brands(slug) on delete cascade,
  customer_id     uuid not null references auth.users(id) on delete cascade,
  customer_name   text,
  question        text not null,
  answer          text,
  status          text not null default 'pending'
                    check (status in ('pending','answered','hidden','flagged')),
  answered_by     uuid references auth.users(id) on delete set null,
  answered_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists designer_questions_product_idx  on public.designer_questions(product_slug, status);
create index if not exists designer_questions_brand_idx    on public.designer_questions(brand_slug, status);
create index if not exists designer_questions_customer_idx on public.designer_questions(customer_id);

alter table public.designer_questions enable row level security;

drop policy if exists "anyone reads answered questions"      on public.designer_questions;
drop policy if exists "customer reads own questions"         on public.designer_questions;
drop policy if exists "customer writes own questions"        on public.designer_questions;
drop policy if exists "seller reads brand questions"         on public.designer_questions;
drop policy if exists "seller answers brand questions"       on public.designer_questions;
drop policy if exists "admin reads all questions"            on public.designer_questions;
drop policy if exists "admin updates questions"              on public.designer_questions;

create policy "anyone reads answered questions" on public.designer_questions
  for select using (status = 'answered');

create policy "customer reads own questions" on public.designer_questions
  for select using (customer_id = auth.uid());

create policy "customer writes own questions" on public.designer_questions
  for insert with check (customer_id = auth.uid());

create policy "seller reads brand questions" on public.designer_questions
  for select using (brand_slug = public.current_brand());

create policy "seller answers brand questions" on public.designer_questions
  for update using (brand_slug = public.current_brand()) with check (brand_slug = public.current_brand());

create policy "admin reads all questions" on public.designer_questions
  for select using (public.is_admin());

create policy "admin updates questions" on public.designer_questions
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── Gift cards ──────────────────────────────────────────────────────────────
-- Issued on successful Stripe Checkout when metadata.gift_card_purchase='1'.
-- Redeemed at /bag by pasting the code; the bag/checkout flow applies the
-- card balance against the order total (capped so at least £0.30 still
-- runs through Stripe — its minimum charge for GBP).
create table if not exists public.gift_cards (
  id                   uuid primary key default gen_random_uuid(),
  code                 text unique not null,                  -- ASOFE-XXXX-XXXX-XXXX
  initial_value_pence  int  not null check (initial_value_pence > 0),
  balance_pence        int  not null check (balance_pence >= 0),
  currency             text not null default 'GBP',
  status               text not null default 'active'
                         check (status in ('active','fully_redeemed','cancelled','refunded')),
  purchaser_email      text,
  purchaser_user_id    uuid references auth.users(id) on delete set null,
  recipient_email      text,
  recipient_name       text,
  personal_message     text,
  issued_via_order_id  uuid references public.orders(id) on delete set null,
  scheduled_send_at    date,                                  -- null = send immediately
  delivered_at         timestamptz,
  expires_at           date,                                  -- 12 months from issue by default
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists gift_cards_code_idx        on public.gift_cards(code);
create index if not exists gift_cards_purchaser_idx   on public.gift_cards(purchaser_user_id);
create index if not exists gift_cards_status_idx      on public.gift_cards(status);

create table if not exists public.gift_card_redemptions (
  id            uuid primary key default gen_random_uuid(),
  gift_card_id  uuid not null references public.gift_cards(id) on delete restrict,
  order_id      uuid not null references public.orders(id) on delete cascade,
  amount_pence  int  not null check (amount_pence > 0),
  created_at    timestamptz not null default now()
);

create index if not exists gift_card_redemptions_card_idx  on public.gift_card_redemptions(gift_card_id);
create index if not exists gift_card_redemptions_order_idx on public.gift_card_redemptions(order_id);

-- Order gains the snapshot of the applied gift card so the receipt + admin
-- view can show the breakdown clearly.
alter table public.orders
  add column if not exists gift_card_code        text,
  add column if not exists gift_card_discount    int not null default 0;

alter table public.gift_cards            enable row level security;
alter table public.gift_card_redemptions enable row level security;

drop policy if exists "purchaser reads own gift cards"     on public.gift_cards;
drop policy if exists "recipient reads gift card by code"  on public.gift_cards;
drop policy if exists "admin reads all gift cards"         on public.gift_cards;
drop policy if exists "admin writes gift cards"            on public.gift_cards;
drop policy if exists "admin reads all redemptions"        on public.gift_card_redemptions;
drop policy if exists "admin writes redemptions"           on public.gift_card_redemptions;

create policy "purchaser reads own gift cards" on public.gift_cards
  for select using (purchaser_user_id = auth.uid());
-- Recipient lookup by code happens via the service-role flow at /bag, so
-- no SELECT policy needed for that path (RLS is bypassed by the admin client).

create policy "admin reads all gift cards" on public.gift_cards
  for select using (public.is_admin());
create policy "admin writes gift cards" on public.gift_cards
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admin reads all redemptions" on public.gift_card_redemptions
  for select using (public.is_admin());
create policy "admin writes redemptions" on public.gift_card_redemptions
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── Wishlist sharing ────────────────────────────────────────────────────────
-- One shareable token per customer. The token is the only secret; lookups
-- from the public view go through the service-role client (RLS denies the
-- anon role) and explicitly require is_active = true.
create table if not exists public.wishlist_shares (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  token         text unique not null,
  display_name  text,                                       -- shown publicly
  message       text,                                       -- one-line intro on the share page
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists wishlist_shares_token_idx on public.wishlist_shares(token) where is_active;

alter table public.wishlist_shares enable row level security;

drop policy if exists "customer manages own wishlist share" on public.wishlist_shares;
drop policy if exists "admin reads all wishlist shares"     on public.wishlist_shares;

create policy "customer manages own wishlist share" on public.wishlist_shares
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "admin reads all wishlist shares" on public.wishlist_shares
  for select using (public.is_admin());

-- ─── Referrals ───────────────────────────────────────────────────────────────
-- Each profile gets a personal referral_code on first /account/referrals
-- visit (lazy generation in app code). Visitors who land via /?ref=CODE
-- have the code set in a cookie; on first paid order the webhook creates
-- a referrals row, issues a £25 store-credit gift card to the referrer,
-- and a separate £25 thank-you card to the referee.
alter table public.profiles
  add column if not exists referral_code text unique;

create table if not exists public.referrals (
  id                       uuid primary key default gen_random_uuid(),
  referrer_user_id         uuid not null references auth.users(id) on delete cascade,
  referee_user_id          uuid references auth.users(id) on delete set null,
  referee_email            text,
  code                     text not null,                  -- snapshot of referrer's code at use time
  status                   text not null default 'pending'
                             check (status in ('pending','rewarded','cancelled')),
  attributed_order_id      uuid references public.orders(id) on delete set null,
  reward_amount_pence      int  not null default 2500,
  referrer_gift_card_id    uuid references public.gift_cards(id) on delete set null,
  referee_gift_card_id     uuid references public.gift_cards(id) on delete set null,
  created_at               timestamptz not null default now(),
  rewarded_at              timestamptz
);

create index if not exists referrals_referrer_idx on public.referrals(referrer_user_id);
create index if not exists referrals_referee_idx  on public.referrals(referee_user_id);
create index if not exists referrals_status_idx   on public.referrals(status);

-- Snapshot which referral code drove this order, settled at checkout time.
alter table public.orders
  add column if not exists referral_code text;

alter table public.referrals enable row level security;

drop policy if exists "referrer reads own referrals" on public.referrals;
drop policy if exists "referee reads own as referee" on public.referrals;
drop policy if exists "admin reads all referrals"    on public.referrals;
drop policy if exists "admin writes referrals"       on public.referrals;

create policy "referrer reads own referrals" on public.referrals
  for select using (referrer_user_id = auth.uid());

create policy "referee reads own as referee" on public.referrals
  for select using (referee_user_id = auth.uid());

create policy "admin reads all referrals" on public.referrals
  for select using (public.is_admin());

create policy "admin writes referrals" on public.referrals
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── Concierge chat ──────────────────────────────────────────────────────────
-- One thread per customer (lazy-created on first message). Messages stream
-- to both sides over Supabase realtime via the supabase_realtime publication.
create table if not exists public.concierge_threads (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null unique references auth.users(id) on delete cascade,
  status        text not null default 'open' check (status in ('open','closed')),
  last_message_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists concierge_threads_status_idx on public.concierge_threads(status, last_message_at desc);

create table if not exists public.concierge_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.concierge_threads(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer','admin','system')),
  sender_id   uuid references auth.users(id) on delete set null,
  body        text not null check (length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);

create index if not exists concierge_messages_thread_idx on public.concierge_messages(thread_id, created_at desc);

alter table public.concierge_threads  enable row level security;
alter table public.concierge_messages enable row level security;

drop policy if exists "customer reads own thread"      on public.concierge_threads;
drop policy if exists "customer inserts own thread"    on public.concierge_threads;
drop policy if exists "admin reads all threads"        on public.concierge_threads;
drop policy if exists "admin writes threads"           on public.concierge_threads;
drop policy if exists "customer reads own messages"    on public.concierge_messages;
drop policy if exists "customer inserts own messages"  on public.concierge_messages;
drop policy if exists "admin reads all messages"       on public.concierge_messages;
drop policy if exists "admin writes messages"          on public.concierge_messages;

create policy "customer reads own thread" on public.concierge_threads
  for select using (customer_id = auth.uid());
create policy "customer inserts own thread" on public.concierge_threads
  for insert with check (customer_id = auth.uid());
create policy "admin reads all threads" on public.concierge_threads
  for select using (public.is_admin());
create policy "admin writes threads" on public.concierge_threads
  for all using (public.is_admin()) with check (public.is_admin());

create policy "customer reads own messages" on public.concierge_messages
  for select using (exists (select 1 from public.concierge_threads t where t.id = thread_id and t.customer_id = auth.uid()));
create policy "customer inserts own messages" on public.concierge_messages
  for insert with check (
    sender_role = 'customer' AND
    exists (select 1 from public.concierge_threads t where t.id = thread_id and t.customer_id = auth.uid())
  );
create policy "admin reads all messages" on public.concierge_messages
  for select using (public.is_admin());
create policy "admin writes messages" on public.concierge_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- Add concierge_messages to the realtime publication so postgres_changes
-- subscriptions deliver INSERTs to clients. Idempotent: skip if already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'concierge_messages'
  ) then
    alter publication supabase_realtime add table public.concierge_messages;
  end if;
end $$;

-- ─── Phase 7: revenue conversion — BIS, abandonment, marketing consent ─────

-- Back-in-stock subscribers. One row per (email, slug, colour, size) until
-- fulfilled. notified_at stamped when the dispatch email goes out so the same
-- subscriber isn't paged twice for the same variant.
create table if not exists public.back_in_stock_notifications (
  id           bigserial primary key,
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,
  product_slug text not null references public.products(slug) on delete cascade,
  colour       text not null default '',
  size         text not null,
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  unsubscribed_at timestamptz
);

create unique index if not exists back_in_stock_active_unique
  on public.back_in_stock_notifications (email, product_slug, colour, size)
  where notified_at is null and unsubscribed_at is null;

create index if not exists back_in_stock_pending_idx
  on public.back_in_stock_notifications (product_slug, colour, size)
  where notified_at is null and unsubscribed_at is null;

alter table public.back_in_stock_notifications enable row level security;

drop policy if exists "user reads own bis"   on public.back_in_stock_notifications;
drop policy if exists "admin reads all bis"  on public.back_in_stock_notifications;
drop policy if exists "admin writes bis"     on public.back_in_stock_notifications;

create policy "user reads own bis" on public.back_in_stock_notifications
  for select using (user_id is not null and user_id = auth.uid());
create policy "admin reads all bis" on public.back_in_stock_notifications
  for select using (public.is_admin());
create policy "admin writes bis" on public.back_in_stock_notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- Marketing consent + abandoned-bag email capture. Kept on profiles so we
-- can suppress all marketing for an opted-out user in one check.
alter table public.profiles
  add column if not exists marketing_opt_in        boolean not null default false,
  add column if not exists marketing_opted_in_at   timestamptz,
  add column if not exists marketing_opted_out_at  timestamptz;

-- Bag snapshots — one row per identity (signed-in user id, or guest email).
-- Rewritten on every bag mutation so we always have the current bag for the
-- abandonment cron. Deleted on successful checkout.
create table if not exists public.bag_snapshots (
  identity     text primary key,                    -- 'user:<uuid>' or 'email:<addr>'
  user_id      uuid references auth.users(id) on delete cascade,
  email        text not null,
  items        jsonb not null,
  subtotal     int  not null check (subtotal >= 0),
  currency     text not null default 'GBP',
  updated_at   timestamptz not null default now()
);

create index if not exists bag_snapshots_updated_idx on public.bag_snapshots (updated_at);

alter table public.bag_snapshots enable row level security;
drop policy if exists "admin manages snapshots" on public.bag_snapshots;
create policy "admin manages snapshots" on public.bag_snapshots
  for all using (public.is_admin()) with check (public.is_admin());

-- Cart abandonment flow state. stage = how many emails we've sent.
-- 0=none, 1=T+1h sent, 2=T+24h sent, 3=T+72h sent. Resets to 0 on next bag activity.
create table if not exists public.cart_abandonment_state (
  identity     text primary key references public.bag_snapshots(identity) on delete cascade,
  stage        int  not null default 0 check (stage between 0 and 3),
  last_sent_at timestamptz
);

alter table public.cart_abandonment_state enable row level security;
drop policy if exists "admin manages abandonment" on public.cart_abandonment_state;
create policy "admin manages abandonment" on public.cart_abandonment_state
  for all using (public.is_admin()) with check (public.is_admin());

-- Light, server-side analytics events. We forward to PostHog from server
-- actions; this table is a durable record + simple admin queries.
create table if not exists public.analytics_events (
  id          bigserial primary key,
  event       text not null,
  user_id     uuid references auth.users(id) on delete set null,
  anon_id     text,
  properties  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_event_idx   on public.analytics_events (event, created_at desc);
create index if not exists analytics_events_user_idx    on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;
drop policy if exists "admin reads events"  on public.analytics_events;
drop policy if exists "admin writes events" on public.analytics_events;
create policy "admin reads events"  on public.analytics_events for select using (public.is_admin());
create policy "admin writes events" on public.analytics_events for insert with check (public.is_admin());

-- ─── Revenue Pack: cart recovery token + welcome discounts + co-purchase ───
--
-- 1. Recovery token on bag_snapshots so abandoned-cart emails carry a single
--    deep link back to /bag?recover=<token> that restores the cookie bag and
--    optionally applies a 10% recovery discount. Token is unguessable.
alter table public.bag_snapshots
  add column if not exists recovery_token text unique;

-- Backfill tokens for any pre-existing rows so the indexed lookup never misses.
update public.bag_snapshots
   set recovery_token = encode(gen_random_bytes(16), 'hex')
 where recovery_token is null;

create index if not exists bag_snapshots_token_idx
  on public.bag_snapshots(recovery_token) where recovery_token is not null;

-- 2. Discount codes: a thin, single-use, percent-or-fixed code generator used
--    for the welcome offer modal AND the abandoned-cart recovery email. Gift
--    cards remain a separate concept (multi-use balance, longer life, GBP).
create table if not exists public.discount_codes (
  code               text primary key,
  kind               text not null check (kind in ('percent','fixed')),
  value              int  not null check (value > 0),         -- percent (1-100) or pence
  min_subtotal_pence int  not null default 0,
  max_uses           int,                                     -- null = unlimited
  uses_count         int  not null default 0,
  first_order_only   boolean not null default false,
  customer_email     text,                                    -- null = any customer
  source             text,                                    -- 'welcome', 'cart_recovery', 'campaign'
  expires_at         timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists discount_codes_email_idx on public.discount_codes(customer_email)
  where customer_email is not null;
create index if not exists discount_codes_source_idx on public.discount_codes(source);

create table if not exists public.discount_redemptions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null references public.discount_codes(code) on delete cascade,
  order_id      uuid not null references public.orders(id)         on delete cascade,
  customer_id   uuid references auth.users(id) on delete set null,
  customer_email text not null,
  amount_pence  int not null check (amount_pence >= 0),
  created_at    timestamptz not null default now()
);

create index if not exists discount_redemptions_code_idx     on public.discount_redemptions(code);
create index if not exists discount_redemptions_order_idx    on public.discount_redemptions(order_id);

alter table public.orders
  add column if not exists discount_code     text,
  add column if not exists discount_amount   int not null default 0;

alter table public.discount_codes        enable row level security;
alter table public.discount_redemptions  enable row level security;

drop policy if exists "admin reads discount codes" on public.discount_codes;
drop policy if exists "admin writes discount codes" on public.discount_codes;
create policy "admin reads discount codes"  on public.discount_codes for select using (public.is_admin());
create policy "admin writes discount codes" on public.discount_codes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin reads discount redemptions" on public.discount_redemptions;
create policy "admin reads discount redemptions" on public.discount_redemptions for select using (public.is_admin());

-- 3. Co-purchase view: `product_copurchases` aggregates paid order_items into
--    "products A and B bought together N times" so the bag cross-sell can
--    query `WHERE product_slug IN (bag-slugs)` and order by frequency.
--    Materialised so the bag page stays fast; refresh nightly via cron.
create materialized view if not exists public.product_copurchases as
with paid_orders as (
  select id
    from public.orders
   where status in ('paid','packed','dispatched','delivered')
),
pairs as (
  select
    a.product_slug as slug_a,
    b.product_slug as slug_b
  from public.order_items a
  join public.order_items b
    on a.order_id = b.order_id
   and a.product_slug < b.product_slug
  where a.order_id in (select id from paid_orders)
)
select
  slug_a,
  slug_b,
  count(*)::int as bought_together
  from pairs
 group by slug_a, slug_b;

create unique index if not exists product_copurchases_pk
  on public.product_copurchases (slug_a, slug_b);
create index if not exists product_copurchases_slug_a_idx
  on public.product_copurchases (slug_a, bought_together desc);
create index if not exists product_copurchases_slug_b_idx
  on public.product_copurchases (slug_b, bought_together desc);

-- Recommended next products: aggregates buyers of X who also bought Y across
-- both pair orderings, returned with bought_together desc. The bag fetches
-- top 4 recommendations.
create or replace function public.recommend_with(p_slugs text[], p_limit int default 8)
returns table (slug text, bought_together int)
language sql
stable
as $$
  with edges as (
    select slug_b as slug, bought_together
      from public.product_copurchases
     where slug_a = any(p_slugs)
    union all
    select slug_a as slug, bought_together
      from public.product_copurchases
     where slug_b = any(p_slugs)
  )
  select slug, sum(bought_together)::int as bought_together
    from edges
   where slug <> all(p_slugs)
   group by slug
   order by bought_together desc
   limit p_limit;
$$;

-- Atomic discount counter — prevents over-redemption of single-use codes
-- under racing concurrent checkouts. Returns the post-increment uses_count.
create or replace function public.increment_discount_uses(p_code text)
returns int
language sql
security definer
set search_path = public
as $$
  update public.discount_codes
     set uses_count = uses_count + 1
   where code = p_code
   returning uses_count;
$$;

-- Nightly refresh entrypoint for the co-purchase view. Wrapped so we don't
-- have to grant raw REFRESH MATERIALIZED VIEW to the service role.
create or replace function public.refresh_copurchases()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.product_copurchases;
end;
$$;
