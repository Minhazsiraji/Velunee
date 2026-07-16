-- Velunee Planner: daily/weekly tasks with realistic-day guidance.
-- Drizzle source: packages/database/src/schema.ts
-- Lives in the existing planning schema alongside reminders.

do $$ begin
  create type public.task_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_status as enum ('todo', 'done');
exception when duplicate_object then null; end $$;

create table if not exists planning.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  title varchar(200) not null,
  notes varchar(500),
  due_on date not null,
  scheduled_time varchar(5),
  priority public.task_priority not null default 'medium',
  estimate_minutes integer,
  status public.task_status not null default 'todo',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists tasks_user_due_idx on planning.tasks(user_id, due_on);

alter table planning.tasks enable row level security;

do $$ begin
  create policy tasks_owner_all on planning.tasks for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
