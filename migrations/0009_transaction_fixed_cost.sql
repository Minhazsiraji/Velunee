-- Velunee Balance: link a transaction to a fixed-cost item.
-- Drizzle source: packages/database/src/schema.ts
-- When set, the transaction is a payment toward that fixed cost: it is drawn
-- from the reserved fixed pool and excluded from the daily discretionary limit.

alter table finance.transactions
  add column if not exists fixed_cost_id uuid references finance.fixed_costs(id) on delete set null;

create index if not exists transactions_fixed_cost_idx on finance.transactions(fixed_cost_id);
