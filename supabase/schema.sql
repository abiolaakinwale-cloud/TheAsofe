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

create index if not exists applications_status_idx on public.applications(status);

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

-- Applications: anonymous can insert; only admin can read/update
drop policy if exists "anyone applies"        on public.applications;
drop policy if exists "admin reads applications" on public.applications;
drop policy if exists "admin updates applications" on public.applications;

create policy "anyone applies" on public.applications
  for insert
  to public
  with check (true);

create policy "admin reads applications" on public.applications
  for select using (public.is_admin());

create policy "admin updates applications" on public.applications
  for update using (public.is_admin()) with check (public.is_admin());
