# ADR 0001: Begin as a modular monolith

- **Status:** Accepted
- **Date:** 2026-07-10

## Context

Velunee needs mobile, admin, AI orchestration, authentication, private media, memory, planning, moderation, billing, and community capabilities. Splitting all of these into microservices before product-market validation would increase deployment, debugging, and data-consistency cost.

## Decision

Use a NestJS modular monolith behind a versioned API. Keep domain packages and database schemas separate. Use provider interfaces for AI, auth, weather, storage, speech, moderation, payments, and notifications.

## Consequences

- The first deployment is simple enough for a small team.
- Secrets and business rules remain outside the mobile app.
- Busy modules can later be extracted without changing the mobile API contract.
- Module boundaries and migrations must be reviewed carefully to avoid a tightly coupled monolith.
