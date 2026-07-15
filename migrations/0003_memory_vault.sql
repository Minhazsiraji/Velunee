-- Personal Memory Vault: user-visible, user-controlled memories.
-- Drizzle source: packages/database/src/schema.ts
-- Adds pause, last-used tracking and per-feature access to assistant.memories.
-- Community is intentionally NOT a valid feature: memories can never be used there.

alter table assistant.memories
  add column if not exists enabled boolean not null default true;

alter table assistant.memories
  add column if not exists last_used_at timestamptz;

alter table assistant.memories
  add column if not exists allowed_features jsonb not null default '["chat","home"]'::jsonb;
