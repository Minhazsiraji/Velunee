-- Velunee Balance: income, expenses, budgets, savings goals, recurring bills
-- Drizzle source: packages/database/src/schema.ts
-- Amounts are integer minor units (poisha for BDT) so calculations stay exact.

create schema if not exists finance;

do $$ begin
  create type public.transaction_kind as enum ('income', 'expense');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('cash', 'card', 'mobile', 'bank', 'other');
exception when duplicate_object then null; end $$;

create table if not exists finance.money_profiles (
  user_id uuid primary key references identity.users(id) on delete cascade,
  currency_code varchar(3) not null default 'BDT',
  monthly_income_minor bigint not null default 0,
  fixed_expenses_minor bigint not null default 0,
  savings_target_minor bigint not null default 0,
  configured_at timestamptz,
  updated_at timestamptz not null default now()
);

-- user_id null marks a shared system category available to everyone.
create table if not exists finance.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references identity.users(id) on delete cascade,
  name varchar(60) not null,
  icon varchar(40) not null default 'pricetag',
  is_fixed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists categories_user_idx on finance.categories(user_id);
create unique index if not exists categories_system_name_uidx
  on finance.categories(name) where user_id is null;
create unique index if not exists categories_user_name_uidx
  on finance.categories(user_id, name) where user_id is not null;

create table if not exists finance.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  kind public.transaction_kind not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency_code varchar(3) not null default 'BDT',
  category_id uuid references finance.categories(id) on delete set null,
  note varchar(240),
  payment_method public.payment_method not null default 'cash',
  occurred_on date not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists transactions_user_occurred_idx
  on finance.transactions(user_id, occurred_on desc);

create table if not exists finance.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  category_id uuid not null references finance.categories(id) on delete cascade,
  month varchar(7) not null,
  limit_minor bigint not null check (limit_minor >= 0),
  updated_at timestamptz not null default now()
);
create unique index if not exists budgets_user_category_month_uidx
  on finance.budgets(user_id, category_id, month);

create table if not exists finance.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  name varchar(120) not null,
  target_minor bigint not null check (target_minor > 0),
  saved_minor bigint not null default 0,
  monthly_contribution_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  achieved_at timestamptz,
  deleted_at timestamptz
);
create index if not exists savings_goals_user_idx on finance.savings_goals(user_id);

create table if not exists finance.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id) on delete cascade,
  name varchar(120) not null,
  amount_minor bigint not null check (amount_minor > 0),
  due_day integer not null check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists recurring_bills_user_idx on finance.recurring_bills(user_id);

-- Row level security: owners only. System categories (user_id null) are readable
-- by everyone but never writable through the API role.
alter table finance.money_profiles enable row level security;
alter table finance.categories enable row level security;
alter table finance.transactions enable row level security;
alter table finance.budgets enable row level security;
alter table finance.savings_goals enable row level security;
alter table finance.recurring_bills enable row level security;

do $$ begin
  create policy money_profiles_owner_all on finance.money_profiles for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy categories_read on finance.categories for select
    using (user_id is null or user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy categories_owner_write on finance.categories for insert
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy categories_owner_update on finance.categories for update
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy categories_owner_delete on finance.categories for delete
    using (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy transactions_owner_all on finance.transactions for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy budgets_owner_all on finance.budgets for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy savings_goals_owner_all on finance.savings_goals for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy recurring_bills_owner_all on finance.recurring_bills for all
    using (user_id = identity.current_user_id())
    with check (user_id = identity.current_user_id());
exception when duplicate_object then null; end $$;

-- Default expense categories shared by all users.
insert into finance.categories (user_id, name, icon, is_fixed) values
  (null, 'Food', 'restaurant', false),
  (null, 'Transport', 'bus', false),
  (null, 'Shopping', 'bag-handle', false),
  (null, 'Rent', 'home', true),
  (null, 'Utilities', 'flash', true),
  (null, 'Education', 'school', true),
  (null, 'Healthcare', 'medkit', false),
  (null, 'Children & family', 'people', false),
  (null, 'Beauty & personal care', 'sparkles', false),
  (null, 'Entertainment', 'film', false),
  (null, 'Loan & EMI', 'card', true),
  (null, 'Gifts', 'gift', false),
  (null, 'Travel', 'airplane', false),
  (null, 'Other', 'pricetag', false)
on conflict do nothing;
