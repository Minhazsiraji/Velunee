# Security Policy

## Reporting a vulnerability

Do not open a public issue for a vulnerability. Contact the repository owner privately through the verified GitHub profile associated with this repository.

## Required production controls

1. Set `AUTH_MODE=required`; development authentication must never be enabled in production.
2. Store all secrets in the hosting platform's secret manager.
3. Restrict Supabase service-role credentials to the API/worker only.
4. Enable PostgreSQL Row-Level Security as defence in depth.
5. Use signed, short-lived media URLs and private storage buckets.
6. Log administrative access and moderation decisions.
7. Redact tokens, message bodies, images, and personal memory from general logs.
8. Apply rate limits, payload limits, and abuse checks before public launch.
9. Rotate keys immediately after accidental exposure.
10. Test account deletion across database, media, memory, sessions, and derived data.
