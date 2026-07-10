# Velunee

**Personal AI Companion** — *Ask. Decide. Shine.*

Velunee is a worldwide, AI-first personal companion for text, voice, image advice, planning, memory, and an optional moderated community.

## Repository status

This repository contains the **MVP foundation** described in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):

- Expo + React Native mobile app
- NestJS modular-monolith API
- Next.js admin portal
- Background worker
- Shared contracts, validation, database, AI, auth, storage, moderation, and observability packages
- PostgreSQL/Drizzle starter schema
- Gemini provider adapter with a local mock fallback
- Development authentication mode plus Supabase JWT verification for production
- GitHub CI and deployment-ready Docker assets

## Prerequisites

- Node.js 22.13 or newer
- Corepack-enabled pnpm 11
- Docker Desktop (optional, for local PostgreSQL and Redis)

```bash
corepack enable
corepack prepare pnpm@11.11.0 --activate
pnpm install
```

## Quick start

Copy the environment templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Start the API and mobile app in separate terminals:

```bash
pnpm dev:api
pnpm dev:mobile
```

- API: `http://localhost:4000/api/v1`
- API health: `http://localhost:4000/api/v1/health`
- Expo dev server: shown in the mobile terminal

Without a Gemini key, the API uses a deterministic mock provider so the complete chat flow can be tested safely.

## Local infrastructure

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Then set `DATABASE_URL` and `REDIS_URL` in `apps/api/.env`.

## Useful commands

```bash
pnpm dev              # all development apps
pnpm build            # build the monorepo
pnpm typecheck        # TypeScript checks
pnpm lint             # lint all workspaces
pnpm db:generate      # generate Drizzle migrations
pnpm db:migrate       # apply Drizzle migrations
```

## Security baseline

- No provider secret belongs in the mobile app.
- Production must use `AUTH_MODE=required`.
- Public/mobile environment variables are not secrets.
- Private conversations and community publishing are separate workflows.
- Gemini requests set `store: false` in the provider adapter.

See [`SECURITY.md`](SECURITY.md) and [`docs/SETUP.md`](docs/SETUP.md).
