-- Velunee Style: digital wardrobe and saved outfits.
-- Drizzle source: packages/database/src/schema.ts
-- Text/attribute based (no photo storage yet) so outfit suggestions stay
-- deterministic and weather-aware.

create schema if not exists style;

do $$ begin
  create type public.wardrobe_category as enum ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.garment_warmth as enum ('light', 'medium', 'warm');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.garment_formality as enum ('casual', 'smart', 'formal');
exception when duplicate_object then null; end $$;

create table if not exists style.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  name varchar(80) not null,
  category public.wardrobe_category not null,
  color varchar(40) not null default 'neutral',
  warmth public.garment_warmth not null default 'medium',
  formality public.garment_formality not null default 'casual',
  notes varchar(240),
  times_worn integer not null default 0,
  last_worn_on date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists wardrobe_items_user_idx on style.wardrobe_items(user_id, category);

create table if not exists style.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  name varchar(80) not null,
  item_ids jsonb not null default '[]'::jsonb,
  occasion varchar(40) not null default 'casual',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists outfits_user_idx on style.outfits(user_id);

alter table style.wardrobe_items enable row level security;
alter table style.outfits enable row level security;

do $$ begin
  create policy wardrobe_items_owner_all on style.wardrobe_items for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy outfits_owner_all on style.outfits for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
