# Velunee Privacy Policy

**Last updated: 12 July 2026**

Velunee ("Velunee", "we", "us") provides a personal AI companion mobile
application and related services (the "Service"). This policy explains what
we collect, why, how it is protected, and the choices you have.

> Before publishing to Google Play, host this document at a public HTTPS URL
> (for example `https://velunee.app/privacy`) and enter that URL in the Play
> Console under **Store presence → App content → Privacy policy**.

## 1. Who is responsible for your data

The data controller is the Velunee team. For any privacy request, contact us
at **privacy@velunee.app** (replace with your monitored address before
launch).

## 2. Information we collect

We collect only what the Service needs to function.

| Category | Examples | Why we collect it |
| --- | --- | --- |
| Account data | Email address, hashed password (managed by our authentication provider) | Create and secure your account |
| Profile data | Display name, companion style, locale, timezone | Personalize responses |
| Content you create | Chat messages, community posts, reactions, comments | Provide the assistant and community features |
| App preferences | Answer length, voice, memory, analytics toggles | Respect your settings |
| Technical data | Device/app version, coarse diagnostics, request identifiers | Reliability, security, abuse prevention |

We do **not** sell your personal data. We do not collect precise location,
contacts, or device identifiers for advertising.

### Guest accounts

You may use Velunee as a guest. A guest account stores conversations against
an anonymous identifier. If you later create an account, that history can be
carried over.

## 3. How we use your information

- Operate the AI assistant and generate responses to your requests.
- Save and sync your conversations so you can return to them.
- Power the optional community: posts, hearts/reactions, and comments.
- Maintain security, prevent abuse, and debug problems.
- Comply with legal obligations.

## 4. AI processing

When you send a message, its content is transmitted to our AI model provider
(Google Gemini) solely to generate a response. We instruct the provider not
to retain your prompts for training (`store: false`). We do not use your
private conversations to train models.

## 5. How your data is protected

- Conversation and message content is **encrypted at rest** (AES‑256‑GCM)
  using keys held only by our backend.
- Transport is protected with HTTPS/TLS.
- Access tokens are stored in the device secure keystore/keychain.
- No AI provider secret is ever shipped inside the mobile app.

## 6. Data sharing

We share data only with service providers that help us run Velunee, under
contract and only as needed:

- **Supabase** — authentication and database hosting.
- **Google Gemini** — AI response generation.

We may disclose information if required by law or to protect users.

## 7. Data retention

- Conversations and content are kept until you delete them or delete your
  account.
- When you delete your account, associated personal data is removed from our
  primary database promptly (see Section 9). Backups are purged on our
  rolling backup cycle (at most 30 days).

## 8. Your rights

Depending on your region (including GDPR and CCPA), you may request access,
correction, export, or deletion of your data. Contact
**privacy@velunee.app**. You can exercise deletion directly in the app.

## 9. Deleting your account and data

You can permanently delete your account from **Profile → Settings → Delete
account** inside the app. This removes your profile, preferences,
conversations, messages, memories, community posts, reactions, and comments,
and deletes your authentication record so the account can no longer sign in.

Web instructions are also published at
[`docs/ACCOUNT_DELETION.md`](ACCOUNT_DELETION.md); host them at a public URL
for the Play Console.

## 10. Children

Velunee is not directed to children under 13 (or the minimum age in your
country). We do not knowingly collect data from children.

## 11. Changes to this policy

We may update this policy. Material changes will be announced in the app or by
email, and the "Last updated" date will change.

## 12. Contact

Questions? Email **privacy@velunee.app**.
