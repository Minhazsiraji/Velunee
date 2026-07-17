-- Velunee Balance: per-cycle savings ledger (net saved = cycle income - cycle
-- spending). One row is banked when a pay cycle ends; the running net savings
-- balance is the sum of these plus what's saved so far this cycle.
-- Drizzle source: packages/database/src/schema.ts

create table if not exists finance.savings_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  cycle_start date not null,
  net_saved_minor bigint not null,
  savings_target_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, cycle_start)
);
create index if not exists savings_ledger_user_idx on finance.savings_ledger(user_id);

alter table finance.savings_ledger enable row level security;

do $$ begin
  create policy savings_ledger_owner_all on finance.savings_ledger for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
