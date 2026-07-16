-- Velunee Learn: structured study mode — learner profile and topic progress.
-- Drizzle source: packages/database/src/schema.ts

create schema if not exists learning;

do $$ begin
  create type public.learner_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.explanation_style as enum ('simple', 'step_by_step', 'exam_focused');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.study_status as enum ('learning', 'reviewing', 'mastered');
exception when duplicate_object then null; end $$;

create table if not exists learning.learner_profiles (
  user_id uuid primary key references identity.users(id) on delete cascade,
  country varchar(60),
  curriculum varchar(80),
  grade varchar(40),
  subject varchar(60),
  language varchar(35) not null default 'en',
  level public.learner_level not null default 'beginner',
  explanation_style public.explanation_style not null default 'simple',
  exam_date date,
  configured_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists learning.study_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  subject varchar(60) not null,
  topic varchar(120) not null,
  status public.study_status not null default 'learning',
  note varchar(240),
  last_reviewed_on date,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists study_topics_user_idx on learning.study_topics(user_id, status);

alter table learning.learner_profiles enable row level security;
alter table learning.study_topics enable row level security;

do $$ begin
  create policy learner_profiles_owner_all on learning.learner_profiles for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy study_topics_owner_all on learning.study_topics for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
