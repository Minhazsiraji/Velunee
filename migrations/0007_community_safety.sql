-- Velunee community safety: block accounts and report posts (outline §19).
-- Drizzle source: packages/database/src/schema.ts

create table if not exists community.blocks (
  blocker_id uuid not null references identity.users(id) on delete cascade,
  blocked_id uuid not null references identity.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on community.blocks(blocked_id);

create table if not exists community.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references identity.users(id) on delete cascade,
  post_id uuid not null references community.posts(id) on delete cascade,
  reason varchar(30) not null,
  note varchar(300),
  status varchar(20) not null default 'open',
  created_at timestamptz not null default now()
);
create unique index if not exists reports_reporter_post_uidx
  on community.reports(reporter_id, post_id);
create index if not exists reports_post_idx on community.reports(post_id);

alter table community.blocks enable row level security;
alter table community.reports enable row level security;

do $$ begin
  create policy blocks_owner_all on community.blocks for all
    using (blocker_id = identity.current_user_id())
    with check (blocker_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy reports_owner_write on community.reports for insert
    with check (reporter_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy reports_owner_read on community.reports for select
    using (reporter_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
