# Velunee — Play Store release checklist

Work top to bottom. Items marked **[you]** need a secret, an account action, or
a product decision only the app owner can make. Everything else is already
implemented in the repository.

## 1. Backend readiness

- [ ] **[you]** Provision a Supabase project (auth + Postgres).
- [ ] **[you]** In Supabase Auth, enable **Email** provider and turn on
      "Confirm email". Enable **Anonymous sign-ins** if you want guest mode.
- [ ] **[you]** Set the API environment (never commit these):
  - `AUTH_MODE=required`
  - `SUPABASE_URL=...`
  - `SUPABASE_SERVICE_ROLE_KEY=...` ← enables in-app account deletion
  - `DATABASE_URL=...`
  - `FIELD_ENCRYPTION_KEY=...` (`openssl rand -base64 32`)
  - `AI_PROVIDER=gemini` and `GEMINI_API_KEY=...`
  - `CORS_ORIGINS=` your production origins
- [ ] Regenerate and apply migrations. The schema now includes the community
      `reactions` and `comments` tables:
  - `pnpm db:generate` — produces the Drizzle-tracked migration in
    `migrations/generated/`.
  - `pnpm db:migrate` — applies it.
  - A reviewed, human-readable mirror is provided at
    `migrations/0001_community_reactions.sql` and can be applied directly with
    `psql` if you manage schema by hand.
- [ ] Deploy the API and confirm `GET /api/v1/health` responds.

## 2. Mobile configuration

- [ ] **[you]** Set mobile env (`apps/mobile/.env`):
  - `EXPO_PUBLIC_API_URL=https://<your-api>/api/v1`
  - `EXPO_PUBLIC_SUPABASE_URL=...`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY=...` (anon key is public by design)
  - Do **not** set `EXPO_PUBLIC_ALLOW_DEV_USER_FALLBACK` in production.
- [ ] **[you]** Add the deep link `velunee://reset-password` to Supabase Auth
      redirect allow-list (for password reset).
- [ ] Confirm `apps/mobile/app.json` package is `com.velunee.app` and bump the
      user-facing `version` for each release.

## 3. Quality gates (run before every release)

```bash
pnpm install
pnpm format        # auto-formats; required so `format:check` passes in CI
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @velunee/api test
```

- [ ] All commands pass.
- [ ] Manually smoke-test: sign up → confirm email → sign in → chat → create
      community post → heart a post → edit settings → delete account.

## 4. Store assets & policy pages

- [ ] **[you]** Host `docs/PRIVACY_POLICY.md` at a public HTTPS URL.
- [ ] **[you]** Host `docs/ACCOUNT_DELETION.md` at a public HTTPS URL.
- [ ] **[you]** Prepare graphics from `docs/PLAY_STORE_LISTING.md` checklist.
- [ ] **[you]** Replace placeholder emails (`privacy@`, `support@`) with real,
      monitored addresses.

## 5. Build & submit (EAS)

- [ ] **[you]** Create an Expo account and run `eas login`.
- [ ] **[you]** Create a Google Play Console developer account ($25 one-time).
- [ ] **[you]** Create a Google Cloud service account with Play access and save
      the JSON as `apps/mobile/google-service-account.json` (git-ignored).
- [ ] Build the release AAB: `eas build --platform android --profile production`.
- [ ] Submit: `eas submit --platform android --profile production`
      (starts on the **internal** testing track as a **draft**).
- [ ] In Play Console: complete Data safety (use `docs/DATA_SAFETY.md`), content
      rating, target audience, and the store listing.

## 6. Go live

- [ ] Promote from internal testing → closed/open testing → production.
- [ ] Verify the privacy policy and data-deletion URLs are live and correct.
- [ ] Tag the release in git and record the versionCode EAS assigned.

## Known follow-ups (not blockers for a first release)

- Voice input/output, selfie/wardrobe vision, and weather-aware suggestions are
  designed for in the schema/product but not yet implemented in the mobile app.
  When added, unblock the matching permissions in `app.json` and update
  `DATA_SAFETY.md` and the privacy policy.
- Community moderation currently auto-approves posts; add a moderation pipeline
  before scaling the community.
