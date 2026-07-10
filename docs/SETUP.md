# Velunee local setup

## 1. Install the required tools

- Node.js 22.13 or newer
- Git
- Docker Desktop (optional)
- Android Studio or the Expo Go app for Android testing

Enable pnpm through Corepack:

```bash
corepack enable
corepack prepare pnpm@11.11.0 --activate
pnpm --version
```

## 2. Install dependencies

From the repository root:

```bash
pnpm install
```

Commit the generated `pnpm-lock.yaml` before opening the first pull request.

## 3. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

The default `AI_PROVIDER=mock` requires no provider key. It returns a safe local response so the mobile-to-API connection can be tested immediately.

To use Gemini:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_from_google_ai_studio
GEMINI_MODEL=gemini-3.1-flash-lite
```

The adapter sends `store: false`. Production use must also be configured under provider terms appropriate for private user conversations.

## 4. Run the first working chat flow

Terminal 1:

```bash
pnpm dev:api
```

Terminal 2:

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:mobile
```

For Expo Go on a physical phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN address, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.25:4000/api/v1
```

The phone and computer must be on the same network, and the firewall must allow port 4000.

## 5. Add local persistence

Start PostgreSQL and Redis:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Apply the reviewed foundation migration:

```bash
psql postgresql://velunee:velunee@localhost:5432/velunee \
  -f migrations/0000_foundation.sql
```

Generate an encryption key:

```bash
./infrastructure/scripts/generate-encryption-key.sh
```

Set these values in `apps/api/.env`:

```env
DATABASE_URL=postgresql://velunee:velunee@localhost:5432/velunee
FIELD_ENCRYPTION_KEY=<generated_base64_key>
```

Chat persistence remains disabled unless both values are configured. This prevents plaintext conversation storage.

## 6. Connect Supabase authentication

Create a Supabase project and set the mobile public values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Set the API values:

```env
AUTH_MODE=required
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_JWT_AUDIENCE=authenticated
```

Never place the Supabase `service_role` key in the mobile app.

## 7. Verify the repository

```bash
pnpm typecheck
pnpm build
./infrastructure/scripts/smoke-test.sh
```

## Common connection issues

- **Phone cannot reach API:** use the computer LAN IP instead of `localhost`.
- **Android emulator cannot reach API:** try `http://10.0.2.2:4000/api/v1`.
- **401 response:** keep `AUTH_MODE=development` for the first local run, or sign in and send a valid Supabase access token.
- **Chat returns mock text:** this is expected until `AI_PROVIDER=gemini` and a key are configured.
- **Database errors:** leave `DATABASE_URL` blank until PostgreSQL is running and migrated.
