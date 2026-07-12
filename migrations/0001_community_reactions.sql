-- Velunee community reactions and comments
-- Drizzle source: packages/database/src/schema.ts
-- Adds heart/love reactions and post comments for the community feed.

do $$ begin
  create type public.reaction_type as enum ('heart', 'love');
exception when duplicate_object then null; end $$;

create table if not exists community.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community.posts(id) on delete cascade,
  user_id uuid not null references identity.users(id) on delete cascade,
  type public.reaction_type not null default 'heart',
  created_at timestamptz not null default now()
);
create unique index if not exists reactions_post_user_type_uidx
  on community.reactions(post_id, user_id, type);
create index if not exists reactions_post_idx
  on community.reactions(post_id);

create table if not exists community.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community.posts(id) on delete cascade,
  user_id uuid not null references identity.users(id) on delete cascade,
  body varchar(2200) not null,
  moderation_status public.moderation_status not null default 'approved',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists comments_post_created_idx
  on community.comments(post_id, created_at desc);
