# Google Play Data Safety — answer sheet

Use this as the source of truth when filling in the **Data safety** form in the
Play Console. Keep it in sync with [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md).
It reflects the app as configured in this repository (network + AI chat +
community; no ads, no location, no camera/mic permissions requested yet).

## Summary answers

- **Does your app collect or share user data?** Yes (collects; shares with
  processors only).
- **Is all data encrypted in transit?** Yes (HTTPS/TLS).
- **Do you provide a way to request data deletion?** Yes — in-app and by email
  (see [`ACCOUNT_DELETION.md`](ACCOUNT_DELETION.md)).
- **Is data encrypted at rest?** Conversation/message content is encrypted at
  rest (AES-256-GCM).

## Data types collected

| Data type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Email address | Yes | No* | Account management, security | Required (unless guest) |
| Name (display name) | Yes | No* | App functionality (personalization) | Optional |
| User-generated content (chat) | Yes | Processed by AI provider | App functionality | Required to use chat |
| User-generated content (community posts/comments) | Yes | Shown to other users | App functionality | Optional |
| App interactions / preferences | Yes | No* | App functionality | Optional |
| Diagnostics (crash/performance) | Yes | No* | Reliability | Optional |

\* "No" means not shared for advertising or with third parties beyond the
service providers (Supabase, Google Gemini) needed to run the app.

## Not collected

- Precise or approximate **location**
- **Contacts**, **calendar**, **SMS/call logs**
- **Photos/videos** or **microphone** (no camera/mic permission is requested
  in the current release; update this sheet when voice/vision features ship)
- **Financial info**, **health info**
- **Advertising identifiers** — the app contains no ads and no ad SDKs.

## Security practices declared

- Data is encrypted in transit.
- Users can request deletion of their data.
- The app follows the Play Families policy only if targeting children (it does
  not target children).

## When features change

If you add **voice input** (microphone), **selfie/wardrobe** (camera), or
**weather** (location), you must:

1. Unblock the relevant permission in `apps/mobile/app.json`.
2. Add the data type to this sheet and the privacy policy.
3. Update the Data safety form before releasing the new version.
