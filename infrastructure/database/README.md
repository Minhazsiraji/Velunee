# Database operations

The source-of-truth schema is `packages/database/src/schema.ts`. Generate migrations with:

```bash
pnpm db:generate
```

Apply generated migrations with:

```bash
DATABASE_URL=postgresql://... pnpm db:migrate
```

`migrations/0000_foundation.sql` is a reviewable bootstrap snapshot for the initial domain layout. Once the first Drizzle migration is generated and verified, use one migration history consistently and do not apply both histories to the same database.
