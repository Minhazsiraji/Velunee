# Contributing

## Branching

- `main`: production-ready history
- `develop`: integration branch when the team grows
- `feat/<name>`: product work
- `fix/<name>`: bug fixes

## Commit style

Use Conventional Commits:

```text
feat(chat): add streaming conversation endpoint
fix(auth): reject expired Supabase access token
```

## Before opening a pull request

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Never commit credentials, production user data, private images, or real conversation exports.
