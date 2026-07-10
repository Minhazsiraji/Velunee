# Velunee MVP delivery roadmap

## Milestone 1 — Useful AI assistant foundation

**Included in this codebase**

- Monorepo and CI foundation
- Expo mobile shell with five-tab navigation
- Functional mobile-to-API text chat
- NestJS modular API
- Mock AI for zero-cost local testing
- Gemini adapter and streaming endpoint
- Development authentication and Supabase JWT verification
- Optional encrypted PostgreSQL persistence
- Admin portal foundation
- Worker foundation

**Acceptance test**

A developer can run the API and mobile app, send a message from the Chat tab, and receive a response without adding any paid service.

## Milestone 2 — Authentication and onboarding

- Email sign-up and verification
- Google and Apple login
- Consent versions
- Language, timezone, and companion-style selection
- Account deletion request
- Production `AUTH_MODE=required`

## Milestone 3 — Voice, image advice, and weather

- Device speech-to-text and text-to-speech
- Separate microphone and photo permissions
- Signed R2 uploads
- Metadata stripping and retention jobs
- Multimodal AI advice
- Permission-based approximate location and weather adapter

## Milestone 4 — Memory, reminders, and subscriptions

- Explicit “Remember this” flow
- Memory center and expiry controls
- Reminder parsing and delivery
- Usage entitlements
- Store purchase verification
- Cost dashboards

## Milestone 5 — Moderated community private beta

- Public profile separated from private assistant profile
- Posts, comments, follows, saves, blocks, and reports
- Text/image moderation before publishing
- Human review queue and appeals
- No private messaging at launch

## Release gates

Community must not launch until moderation, report/block tools, age eligibility, administrative roles, audit logging, deletion, and incident response are tested end to end.
