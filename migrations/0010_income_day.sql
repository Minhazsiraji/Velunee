-- Velunee Balance: salary/income day for pay-cycle budgeting.
-- Drizzle source: packages/database/src/schema.ts
-- When set (1-28), the budget window runs from this day for 30 days instead of
-- following the calendar month, so the daily limit resets on payday.

alter table finance.money_profiles
  add column if not exists income_day integer;
