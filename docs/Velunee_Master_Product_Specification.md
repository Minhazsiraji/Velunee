# Velunee — Master Product Specification

**Product:** Velunee — Personal AI Companion
**Tagline:** _Ask. Decide. Shine._
**Positioning:** Velunee is a personal AI companion that understands your daily life, connects your plans, money, learning, style and goals, and helps you confidently decide what to do next.
**Platforms:** Android first (Play Store), then iOS and web.
**Last updated:** 2026-07-15

This is the single source of truth for Velunee product and engineering work. It consolidates and supersedes scattered notes and chat discussions. Two companion documents carry the full detail and are part of this specification:

| Document                                                                 | Contents                                                                                                                                            |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Velunee_Final_App_Architecture.md](./Velunee_Final_App_Architecture.md) | Approved production architecture: modular NestJS monolith, provider adapters, 19 modules, database domain layout, technology stack, scaling roadmap |
| [Velunee_Final_43_Improvements.md](./Velunee_Final_43_Improvements.md)   | 43-section user-perspective improvement outline: product north star, six experiences, improvement phases, acceptance criteria, coding instructions  |

Read both before starting significant product or engineering work. Section 42 of the improvements document contains the standing instructions that apply to **every** future change.

---

## 1. Product North Star

Velunee must not feel like a collection of unrelated tools. It should feel like **one intelligent companion that understands the user's situation, connects the important parts of their life and helps them decide what to do next.**

Every feature must support at least one of: save time, reduce confusion, improve daily decisions, increase confidence, protect privacy, or support progress toward personal goals. Features are never added merely because competitors have them.

**Primary promise:** _Tell Velunee what is happening in your life. It will understand the situation, consider what matters to you and help you choose the best next step._
**Short version:** _One companion. Smarter everyday decisions._

## 2. The six connected experiences

All product work organizes around six experiences operating through one shared assistant and one user-controlled memory system:

| Experience          | Purpose                                                                                         | Status (2026-07)                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Velunee Daily**   | Personalized daily overview: weather, schedule, safe-to-spend, reminders, one useful suggestion | Not started — next major milestone                                                              |
| **Velunee Decide**  | Context-aware decision help: recommendation + why + alternative + impact + next action          | Not started — signature feature, Phase 2                                                        |
| **Velunee Balance** | Money tracking, safe spending, budgets, savings goals, bill reminders                           | **MVP built** (`feature/velunee-balance`)                                                       |
| **Velunee Style**   | Wardrobe-aware outfit and shopping guidance (no beauty scores, ever)                            | Partial — vision/outfit advice exists; digital wardrobe not started                             |
| **Velunee Learn**   | Structured, personalized study support (teach, don't just answer)                               | Not started                                                                                     |
| **Velunee Circle**  | Safe community and private groups                                                               | Partial — feed, posts, reactions, moderation queue exist; groups/blocking/reporting not started |

## 3. Current implementation status

What exists in the repository today (`main` + open feature branches):

### Built and merged

- **Monorepo foundation** — pnpm + Turborepo: `apps/mobile` (Expo/React Native), `apps/api` (NestJS), `apps/admin` (Next.js), `apps/worker`; shared packages: `contracts` (zod), `database` (Drizzle + hand-written SQL migrations with RLS), `auth-core`, `ai-core`, `moderation-core`, `ui`, `validation`, `shared`, `observability`, `storage-core`.
- **Auth & account** — Supabase auth (email sign-up/in/reset, guest + guest upgrade), profile/settings, preferences, in-app account deletion (`DELETE /account` with service-role cleanup).
- **Chat** — Gemini-backed conversation with SSE streaming, conversation management (list/rename/delete), encrypted message content, model-usage tracking.
- **Community** — feed with cursor pagination, posts, heart/love reactions, comments table, heuristic + provider moderation with review queue and admin approve/reject.
- **Vision** — private image advice (selfie/outfit/general modes).
- **Voice** — voice input (record + transcribe) and TTS playback of answers.
- **Weather** — weather-aware chat suggestions (WeatherAPI adapter).
- **Release engineering** — Android/EAS build config, expo-updates, CI (format/typecheck/build), Play Store docs.

### Built, in review (branch `feature/velunee-balance`)

- **Velunee Balance MVP** — see §4 below.

### Not started (ordered by the improvement phases in the 43-section outline)

1. **Phase 1 remainder:** Home command centre, basic Daily Brief, Personal Memory Vault UI, Privacy Centre, notification system.
2. **Phase 2:** Velunee Decide, "Why this recommendation?", cross-feature context with permission boundaries, Do-It-for-Me actions, Money Weather.
3. **Phase 3:** Style digital wardrobe, structured Learn mode, Planner, richer weather guidance, international settings (currency/date/number formats, RTL).
4. **Phase 4:** Community groups, block/report/mute, private accounts, appeals.
5. **Phase 5:** predictive suggestions, routines, household tools, advanced multilingual support.

## 4. Velunee Balance (shipped MVP)

Deterministic money management. All amounts are integer minor units (poisha); every calculation is exact integer math, and financial responses include a `calculation` array answering "How was this calculated?" — a hard requirement from §42 of the improvement outline.

- **Data:** `finance` schema (migration `0002_velunee_balance.sql`, RLS on every table): `money_profiles`, `categories` (14 seeded defaults + custom), `transactions`, `budgets`, `savings_goals`, `recurring_bills`.
- **API:** `/balance/*` — overview (safe-to-spend today, suggested daily limit, projections, top categories, budget status, upcoming bills, supportive rule-based insights), profile setup, transactions (list/add/delete + deterministic natural-text parse: "500 groceries and 200 rickshaw"), budgets, goals (with ETA), bills, monthly report (category/day breakdowns, previous-month comparison, savings rate).
- **Mobile:** Balance tab (dashboard + quick add + setup wizard), transactions, budgets, goals, report screens.
- **Fixed vs variable:** fixed costs (rent, EMI, school fees) are reserved up front — profile estimate holds their place until actual fixed spending exceeds it — so the daily limit budgets only everyday variable spending.
- **Privacy:** financial data is owner-only (RLS), never surfaces in community, and the client supplies its local date so day boundaries follow the user's timezone.
- **Deferred (per outline §13):** Money Weather, Can-I-Afford-This, Future Me Preview, Recovery Mode, Safety Days, multi-currency accounts, remittance tracking, Travel Mode, receipt scanning, bank SMS detection.

## 5. Architecture (summary — full detail in the architecture document)

- **Pattern:** modular NestJS monolith behind a versioned API; Expo mobile app and Next.js admin as clients. The mobile app never owns secrets and talks only to the Velunee API.
- **Providers via adapters:** `AIProvider` (Gemini initially), `WeatherProvider` (WeatherAPI), `AuthProvider` (Supabase), `StorageProvider` (R2), moderation, notifications — all replaceable independently.
- **Data:** PostgreSQL (Supabase initially) is the system of record; domain-separated schemas (`identity`, `assistant`, `planning`, `community`, `moderation`, `billing`, `finance`, `operations`, `audit`); Drizzle ORM; hand-written SQL migrations in `/migrations` (source of truth; applied via the Supabase SQL editor or psql — **not** `drizzle-kit migrate`, whose journal only tracks `/migrations/generated`).
- **Security:** RLS on user data + API authorization + field-level encryption for sensitive content (chat messages, memories) + signed media URLs + audit logging.
- **Scaling:** modular monolith → extract high-load modules (AI, feed, media, notifications) only when demand requires.

## 6. Non-negotiable rules (apply to every change)

1. Private AI conversations, financial records, memories and private images **never** become community content automatically.
2. Important financial calculations come from a deterministic system and include "How was this calculated?".
3. Users can view, edit and delete what Velunee remembers; account deletion works in-app and cleans database, media, memories and tokens.
4. Advice separates facts, calculations, assumptions and personal recommendations; Velunee never pretends certainty it doesn't have.
5. No beauty scores or appearance judgments — styling guidance only.
6. Warm, respectful, non-judgmental, never manipulative or emotionally pressuring; no guilt-based notifications.
7. Cross-feature data access defaults to minimum necessary and is user-controllable.
8. Useful behaviour must survive AI/network outages: clear loading, retry, offline and error states without losing user input.
9. Do not build: investment/crypto trading, loans, dating, live streaming, public financial rankings, tax filing — until the core experience is stable and trusted (outline §37).

## 7. Development workflow

- Feature branches → PR → `main`; CI gates on `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
- Contracts-first: new endpoints start as zod schemas in `packages/contracts`, shared by API and mobile.
- Repository layer per module (`*.repository.ts`) with a null-connection fallback; services hold business logic and are unit-tested (Jest).
- New tables: add to `packages/database/src/schema.ts` **and** a numbered SQL migration in `/migrations` with RLS policies, mirroring existing style.
- Verification before merge: typecheck + build + API tests in the Codespace, EAS preview build for mobile-visible changes.

## 8. Roadmap

Milestones follow the five improvement phases (outline §39). Immediate order of work:

1. **Merge Velunee Balance** (PR open; apply migration 0002; verify EAS preview build).
2. **Home command centre + basic Daily Brief** — the single most important improvement (outline §4–5): greeting, weather advice, safe-to-spend, upcoming bill, reminders, one suggestion; user-controlled cards.
3. **Personal Memory Vault + Privacy Centre** (outline §7, §20) — make personalization visible and controllable.
4. **Velunee Decide** (outline §6) — the signature decision system, wired to weather + Balance + preferences with permission boundaries (§21).
5. **Do-It-for-Me actions** (outline §9) — add expense / create reminder / start goal directly from chat.
6. Then Phase 3 specialized experiences (Style wardrobe, Learn, Planner) and Phase 4 community safety before any community growth push.

Success is measured by the user-perspective acceptance criteria (outline §40) and usefulness indicators (§41) — never by screen time alone.
