# ADR 0002: Do not persist plaintext private chat

- **Status:** Accepted
- **Date:** 2026-07-10

## Decision

Chat persistence is enabled only when both `DATABASE_URL` and a valid 32-byte `FIELD_ENCRYPTION_KEY` are configured. Message content is encrypted with AES-256-GCM before insertion.

## Consequences

- A first local run works without a database.
- Accidentally configuring a database without encryption does not store private message text.
- Key rotation and decryption support must be added before production migration or support tooling.
