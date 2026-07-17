-- Velunee Balance: itemized fixed costs.
-- Drizzle source: packages/database/src/schema.ts
-- Each user lists their fixed monthly costs (rent, utilities, loan/EMI, etc.)
-- as named items with amounts. Their total is reserved upfront so paying a
-- fixed bill on any day never reduces the daily discretionary limit.

create table if not exists finance.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  name varchar(60) not null,
  amount_minor bigint not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists fixed_costs_user_idx on finance.fixed_costs(user_id);

alter table finance.fixed_costs enable row level security;

do $$ begin
  create policy fixed_costs_owner_all on finance.fixed_costs for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
