# Play Store readiness — implementation report

Branch: `feature/play-store-release`. This report summarizes what was built on
top of the MVP foundation to make Velunee ready for a Google Play submission.

## Phases completed

### 1. Real authentication

- `auth-provider` gained `signUpWithEmail`, `signInWithEmail`,
  `sendPasswordReset` (guest sign-in retained). Anonymous guests can upgrade to
  a full email account in place, keeping their history.
- New screens: `sign-in`, `sign-up`, `forgot-password`; the welcome screen now
  leads with Create Account / Sign In and keeps guest as a secondary option.
- Shared, reusable `FormField` and `PrimaryButton` components and an auth
  validation/error-mapping helper.

### 2. Conversation persistence

- Already present in the foundation (encrypted, server-side). Verified and
  reused; profile now surfaces the conversation count.

### 3. Heart/love reactions (+ community feed)

- New `community.reactions` and `community.comments` tables (schema +
  `migrations/0001_community_reactions.sql`).
- New API module `community`: `GET /community/feed` (cursor paginated),
  `POST /community/posts`, `POST|DELETE /community/posts/:id/reactions`.
- Mobile community tab rewritten into a real feed with a composer, optimistic
  heart toggling, pull-to-refresh, and infinite scroll.

### 4. Profile & settings

- New API module `account`: `GET /account`, `PATCH /account/profile`,
  `PATCH /account/preferences`.
- Profile tab is now a hub (identity, stats, guest upgrade prompt); a new
  Settings screen edits display name, companion style, and preferences.

### 5. In-app account deletion

- `DELETE /account` removes all owned data (via `ON DELETE CASCADE`) and the
  Supabase auth user through a new admin capability in `auth-core`
  (`deleteAuthUser`, gated by `SUPABASE_SERVICE_ROLE_KEY`).
- Settings screen has a confirmation-gated "Delete account" flow.

### 6. Error / loading / empty / offline states

- New screens use explicit loading spinners, empty states, error states with
  retry, and inline validation. The API client already maps network/timeout
  failures to friendly messages.

### 7. Tests

- Jest config for the API plus unit tests for `AccountService` (deletion
  orchestration, anonymous detection) and `CommunityService` (reaction rules,
  persistence guard).

### 8. Production security

- `AUTH_MODE=required` documented as mandatory; service-role key kept
  server-only; env examples updated; release credentials git-ignored.

### 9. Android / EAS release config

- `app.json`: Android permissions limited to INTERNET; camera/mic/location
  explicitly blocked until those features ship.
- `eas.json`: production builds an AAB; submit configured for the Play internal
  track as a draft.

### 10–11. Privacy & Play Store docs

- `PRIVACY_POLICY.md`, `ACCOUNT_DELETION.md`, `DATA_SAFETY.md`,
  `PLAY_STORE_LISTING.md`, and `RELEASE_CHECKLIST.md`.

## Verification status

The development toolchain (Node/pnpm) was **not** available in the authoring
environment, so `typecheck`, `lint`, `test`, and `build` were **not executed
here**. Run the quality gates in Section 3 of the release checklist before
pushing — in particular `pnpm format`, since CI enforces `format:check`.

## Owner actions still required

Supabase project + keys, `SUPABASE_SERVICE_ROLE_KEY`, Gemini key, hosting the
policy/deletion pages, Play Console + EAS accounts, and store graphics. These
are itemized in [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md).
