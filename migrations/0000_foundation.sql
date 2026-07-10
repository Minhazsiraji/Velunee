-- Velunee MVP foundation snapshot
-- Review before production. Drizzle source: packages/database/src/schema.ts

create extension if not exists pgcrypto;

create schema if not exists identity;
create schema if not exists assistant;
create schema if not exists planning;
create schema if not exists community;
create schema if not exists moderation;
create schema if not exists billing;
create schema if not exists operations;
create schema if not exists audit;

do $$ begin
  create type public.message_role as enum ('user', 'assistant', 'system', 'tool');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.input_mode as enum ('text', 'voice', 'image');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.memory_type as enum ('preference', 'goal', 'routine', 'project', 'person', 'date', 'communication', 'temporary');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.content_visibility as enum ('private', 'followers', 'public');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.moderation_status as enum ('pending', 'approved', 'review', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists identity.users (
  id uuid primary key,
  auth_provider_id uuid not null unique,
  email varchar(320),
  status varchar(32) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists identity.profiles (
  user_id uuid primary key references identity.users(id) on delete cascade,
  display_name varchar(120),
  preferred_locale varchar(35) not null default 'en',
  timezone varchar(100) not null default 'UTC',
  country_code varchar(2),
  companion_style varchar(40) not null default 'warm',
  profile_photo_key text,
  updated_at timestamptz not null default now()
);

create table if not exists identity.preferences (
  user_id uuid primary key references identity.users(id) on delete cascade,
  answer_length varchar(20) not null default 'balanced',
  voice_enabled boolean not null default true,
  memory_enabled boolean not null default true,
  analytics_enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists identity.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  consent_type varchar(60) not null,
  version varchar(30) not null,
  granted boolean not null,
  recorded_at timestamptz not null default now()
);
create index if not exists consents_user_id_idx on identity.consents(user_id);

create table if not exists assistant.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  title varchar(200),
  locale varchar(35),
  summary_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists conversations_user_updated_idx on assistant.conversations(user_id, updated_at desc);

create table if not exists assistant.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references assistant.conversations(id) on delete cascade,
  user_id uuid not null references identity.users(id) on delete cascade,
  role public.message_role not null,
  input_mode public.input_mode not null default 'text',
  content_encrypted text not null,
  provider varchar(50),
  model varchar(120),
  request_id varchar(100),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists messages_conversation_created_idx on assistant.messages(conversation_id, created_at);

create table if not exists assistant.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  type public.memory_type not null,
  content_encrypted text not null,
  importance integer not null default 1,
  sensitivity varchar(30) not null default 'private',
  consent_status varchar(30) not null default 'pending',
  source_message_id uuid references assistant.messages(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists memories_user_type_idx on assistant.memories(user_id, type);

create table if not exists assistant.model_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references identity.users(id) on delete set null,
  request_id varchar(100) not null unique,
  provider varchar(50) not null,
  model varchar(120) not null,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer not null,
  estimated_cost_usd real,
  created_at timestamptz not null default now()
);

create table if not exists planning.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  title varchar(240) not null,
  notes_encrypted text,
  timezone varchar(100) not null,
  due_at timestamptz not null,
  recurrence_rule text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reminders_user_due_idx on planning.reminders(user_id, due_at);

create table if not exists community.public_profiles (
  user_id uuid primary key references identity.users(id) on delete cascade,
  handle varchar(40) not null unique,
  bio varchar(300),
  is_private boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists community.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  caption varchar(2200),
  visibility public.content_visibility not null default 'public',
  moderation_status public.moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists posts_status_created_idx on community.posts(moderation_status, created_at desc);

create table if not exists community.follows (
  follower_id uuid not null references identity.users(id) on delete cascade,
  following_id uuid not null references identity.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create table if not exists moderation.content_checks (
  id uuid primary key default gen_random_uuid(),
  subject_type varchar(30) not null,
  subject_id uuid not null,
  provider varchar(50) not null,
  decision public.moderation_status not null,
  risk_score real not null,
  categories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists content_checks_subject_idx on moderation.content_checks(subject_type, subject_id);

create table if not exists billing.plans (
  id varchar(40) primary key,
  name varchar(80) not null,
  entitlements jsonb not null,
  active boolean not null default true
);

create table if not exists billing.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  feature varchar(80) not null,
  units integer not null default 1,
  occurred_at timestamptz not null default now()
);
create index if not exists usage_events_user_feature_idx on billing.usage_events(user_id, feature, occurred_at);

create table if not exists operations.feature_flags (
  key varchar(120) primary key,
  enabled boolean not null default false,
  rules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists audit.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references identity.users(id) on delete set null,
  event_type varchar(100) not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists security_events_type_time_idx on audit.security_events(event_type, occurred_at);

insert into billing.plans (id, name, entitlements)
values
  ('free', 'Velunee Free', '{"chat_daily":20,"image_monthly":3,"memory":true}'::jsonb),
  ('plus', 'Velunee Plus', '{"chat_daily":200,"image_monthly":50,"memory":true,"current_information":true}'::jsonb),
  ('premium', 'Velunee Premium', '{"chat_daily":1000,"image_monthly":200,"memory":true,"realtime_voice":true}'::jsonb)
on conflict (id) do nothing;

insert into operations.feature_flags (key, enabled) values
  ('chat', true),
  ('voice', false),
  ('image_advice', false),
  ('memory', false),
  ('community', false)
on conflict (key) do nothing;

-- Defence in depth. A non-owner API role can set app.user_id per transaction.
create or replace function identity.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

alter table identity.profiles enable row level security;
alter table identity.preferences enable row level security;
alter table identity.consents enable row level security;
alter table assistant.conversations enable row level security;
alter table assistant.messages enable row level security;
alter table assistant.memories enable row level security;
alter table planning.reminders enable row level security;

do $$ begin
  create policy profiles_owner_all on identity.profiles for all using (user_id = identity.current_user_id()) with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy preferences_owner_all on identity.preferences for all using (user_id = identity.current_user_id()) with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy consents_owner_all on identity.consents for all using (user_id = identity.current_user_id()) with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy conversations_owner_all on assistant.conversations for all using (user_id = identity.current_user_id()) with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy messages_owner_all on assistant.messages for all using (user_id = identity.current_user_id()) with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy memories_owner_all on assistant.memories for all using (user_id = identity.current_user_id()) with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy reminders_owner_all on planning.reminders for all using (user_id = identity.current_user_id()) with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
