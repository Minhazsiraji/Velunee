# Velunee — Final Modular App Architecture

**Product:** Velunee  
**Positioning:** Personal AI Companion  
**Tagline:** _Ask. Decide. Shine._  
**Target market:** Worldwide  
**Platforms:** Android first, then iOS and web  
**Core experience:** Text, voice and image-based personal AI assistance with an optional moderated community

> **Interpretation note:** Privacy and security must never be overlooked or compromised. Every major service should also have a clear free-to-premium scaling path.

---

# 1. Final Architecture Decision

Velunee should begin as a **modular monolith with an independent backend API**.

It should not begin as:

- A collection of microservices.
- A mobile app directly connected to every database table.
- A system permanently dependent on one AI company.
- A system where Supabase contains all business logic.
- A public social network without moderation infrastructure.

## Final architecture pattern

```text
┌─────────────────────────────────────────────┐
│                 CLIENT APPS                 │
│                                             │
│  Velunee Mobile App     Admin Web Portal    │
│  Expo/React Native      Next.js             │
└───────────────────┬─────────────────────────┘
                    │ HTTPS / SSE / WebSocket
                    ▼
┌─────────────────────────────────────────────┐
│          VELUNEE BACKEND API                │
│                                             │
│  NestJS Modular Monolith                    │
│  Authentication verification               │
│  Business rules                             │
│  AI orchestration                           │
│  Privacy enforcement                        │
│  Rate limiting                              │
│  Moderation                                 │
│  Subscription control                       │
└───────┬─────────┬──────────┬─────────┬──────┘
        │         │          │         │
        ▼         ▼          ▼         ▼
 PostgreSQL     Redis     Object      External
 Database       Cache     Storage     Providers
 Supabase       Upstash   R2          AI/Weather/
 initially                            Search/Voice
```

Expo supports one TypeScript project across Android, iOS and web, while NestJS is designed for modular and scalable TypeScript backend applications. NestJS also supports server-sent events, WebSockets, queues and later microservice transporters.

## Why this is better than the previous structure

The earlier structure relied too heavily on direct Supabase access. The final structure adds a dedicated backend between the app and infrastructure.

This gives Velunee:

- Stronger security control.
- Easier provider replacement.
- Centralized business logic.
- Better AI-cost management.
- Easier mobile-app maintenance.
- Freedom to move PostgreSQL to AWS, Google Cloud, Azure or self-hosted infrastructure.
- Freedom to replace Gemini, storage, weather or authentication providers independently.
- A clear path from MVP to millions of users.

---

# 2. Core Architectural Principles

## Principle 1 — The mobile app never owns secrets

The app must never contain:

- AI API keys.
- Weather API keys.
- Storage secret keys.
- Database administrator keys.
- Payment secrets.
- Moderation-provider secrets.

The app receives only short-lived user tokens and temporary signed media URLs.

## Principle 2 — Providers are accessed through adapters

Every external provider must have an internal interface.

```text
AIProvider
WeatherProvider
SearchProvider
StorageProvider
AuthProvider
SpeechProvider
ModerationProvider
PaymentProvider
NotificationProvider
```

For example, the mobile application asks Velunee’s backend for weather. It does not know whether the weather comes from WeatherAPI, Open-Meteo or another provider.

## Principle 3 — PostgreSQL remains the system of record

PostgreSQL will contain the authoritative data for:

- Users.
- Conversations.
- Memories.
- Community posts.
- Reports.
- Subscriptions.
- Usage.
- Consent.
- Audit records.

Supabase provides a full PostgreSQL database rather than a proprietary database abstraction. Supabase can also be self-hosted using Docker, and its CLI supports database dumps and migrations, providing a practical migration route.

## Principle 4 — Privacy is designed into every module

Privacy is not one separate settings page. It affects:

- Database design.
- AI requests.
- Analytics.
- Image storage.
- Location handling.
- Memory.
- Admin access.
- Log retention.
- Account deletion.

## Principle 5 — Scale modules only when required

Velunee begins as one backend deployment with internally separated modules.

When demand increases, high-load modules can be extracted independently:

```text
AI Service
Community Feed Service
Media Service
Notification Service
Moderation Service
Search Service
Billing Service
```

This prevents premature complexity while preserving a clear scaling route.

---

# 3. Requirements Coverage Audit

| Requirement                   | Architecture solution                                     | Status  |
| ----------------------------- | --------------------------------------------------------- | ------- |
| Worldwide application         | Localization, regional settings, global API deployment    | Covered |
| Text input and output         | Core Conversation module                                  | Covered |
| Voice input and output        | Voice Experience module                                   | Covered |
| Automatic language detection  | Device locale plus backend message detection              | Covered |
| Automatic weather detection   | Permission-based location plus Weather Adapter            | Covered |
| Users can ask broad questions | AI Orchestrator plus tools and current-information search | Covered |
| Personalized assistant        | Profile, preference and memory modules                    | Covered |
| Image advice                  | Private image analysis workflow                           | Covered |
| Community image sharing       | Community module after AI advice                          | Covered |
| Privacy and security          | Dedicated security, consent, retention and audit layers   | Covered |
| Free initial stack            | Expo, Supabase, Cloud Run, R2 and limited AI tiers        | Covered |
| Premium migration             | Provider adapters and portable PostgreSQL                 | Covered |
| Large-demand scalability      | Cache, queue, replicas, service extraction and CDN        | Covered |
| Admin management              | Separate admin and moderation portal                      | Covered |
| Monetization                  | Entitlement and subscription module                       | Covered |

---

# 4. Final Module-Wise Structure

## Module 1 — Application Shell and Navigation

### Frontend

- Splash screen.
- App-version check.
- Deep-link handling.
- Global error screen.
- Offline state.
- Loading states.
- Theme management.
- Bottom navigation.
- Accessibility controls.
- Global language configuration.

### Backend

- Minimum supported app version.
- Maintenance-mode status.
- Feature flags.
- Country-based feature availability.
- Remote configuration.
- App announcements.

---

## Module 2 — Onboarding and Consent

### Frontend

- Velunee introduction.
- Language confirmation.
- Companion-style selection.
- Interest selection.
- Notification request.
- Optional location request.
- Voice permission request.
- Community-rules acceptance.
- Privacy summary.
- Age confirmation.
- Guest-preview mode.

### Backend

- Save onboarding progress.
- Save consent version and timestamp.
- Create default preferences.
- Create initial companion profile.
- Assign feature flags.
- Record age eligibility for community access.
- Prevent unsupported consent states.

### Important rule

Location, microphone, photos and notifications must be requested separately and only when their related features are used.

---

## Module 3 — Authentication and Account

### Frontend

- Email registration.
- Email login.
- Google login.
- Apple login.
- Password reset.
- Email verification.
- Active-device management.
- Logout from one or all devices.
- Account deletion.
- Account recovery.

### Backend

- Verify authentication tokens.
- Create internal user identity.
- Manage sessions.
- Apply login rate limits.
- Detect suspicious authentication activity.
- Revoke compromised sessions.
- Manage account suspension.
- Process account deletion.

### Initial provider

**Supabase Auth**, accessed through a Velunee `AuthProvider` adapter.

### Future options

- Amazon Cognito.
- Auth0.
- Clerk.
- Self-hosted authentication.
- Enterprise SSO.

The mobile app should depend on Velunee’s authentication interface rather than embedding Supabase-specific logic throughout the application.

---

## Module 4 — User Profile and Companion Personalization

### Frontend

- Name and profile photo.
- Country and time zone.
- Preferred language.
- Interests.
- Goals.
- Preferred answer length.
- Preferred communication style.
- Voice preference.
- Companion personality.
- Content sensitivities.
- Accessibility settings.

### Backend

- Store profile data.
- Store AI preferences separately from public community data.
- Generate companion configuration.
- Maintain profile-version history.
- Synchronize settings across devices.
- Validate profile visibility.
- Apply default settings by region.

### Companion styles

- Warm and supportive.
- Direct and practical.
- Calm and logical.
- Fun and friendly.
- Motivational.
- Professional.

---

## Module 5 — Home and Daily Companion

### Frontend

- Personalized greeting.
- Weather summary.
- Suggested questions.
- Daily planning card.
- Recent chats.
- Saved reminders.
- Community highlights.
- Quick voice button.
- Image-advice shortcut.

### Backend

- Build personalized home response.
- Cache weather.
- Generate suggestions from interests.
- Retrieve recent conversations.
- Retrieve reminders.
- Exclude sensitive information from the home screen.
- Apply subscription and feature permissions.

---

## Module 6 — Core AI Conversation

### Frontend

- Text input.
- Streaming answer.
- Voice-input button.
- Image attachment.
- Conversation history.
- Suggested follow-up questions.
- Stop generation.
- Regenerate response.
- Copy or share.
- Save useful response.
- Like, dislike or report an answer.
- Source display where available.

### Backend

- Authenticate user.
- Validate message.
- Check usage entitlement.
- Detect language.
- Detect user intent.
- Apply safety classification.
- Retrieve relevant memories.
- Select external tools.
- Select AI model.
- Generate and stream response.
- Validate the final output.
- Save conversation.
- Record token cost and latency.
- Collect quality feedback.

### Streaming

Use **server-sent events** for ordinary text streaming. Use WebSockets only for full-duplex, real-time voice and live interactive sessions.

---

## Module 7 — AI Orchestrator and Model Gateway

This is the intelligence centre of Velunee.

### Backend responsibilities

- Prompt assembly.
- Model routing.
- Provider selection.
- Tool calling.
- Conversation summarization.
- Context-window management.
- Cost control.
- Response-quality checks.
- Provider fallback.
- Retry and timeout management.
- Structured-output validation.
- Safety policy enforcement.

### Suggested routing

```text
Simple classification
→ Low-cost model

Normal conversation
→ Fast general model

Complex reasoning
→ Higher-intelligence model

Image advice
→ Multimodal model

Real-time voice
→ Live audio model

Memory search
→ Embedding model

Current information
→ Search or grounding provider
```

### Provider independence

```typescript
interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIChunk>;
  analyzeImage(request: ImageRequest): Promise<ImageResult>;
  embed(input: string[]): Promise<number[][]>;
}
```

Free AI access should be limited to development or synthetic testing. Private beta and production user conversations should use paid data-handling terms.

---

## Module 8 — Voice Experience

### Frontend

- Tap-to-speak.
- Live transcription.
- Edit transcription.
- Voice-response playback.
- Pause and resume.
- Speech-speed control.
- Voice selection.
- Hands-free conversation mode.
- Audio-permission management.

### Backend

- Accept transcript as a message.
- Store input type as voice.
- Route real-time voice sessions.
- Apply voice-session limits.
- Remove temporary audio.
- Prevent raw audio retention by default.
- Provide language and pronunciation settings.

### MVP approach

Use device speech recognition and device text-to-speech where reliable.

### Premium approach

Add cloud speech recognition and real-time AI voice for:

- Better multilingual quality.
- Noise handling.
- Natural interruptions.
- Emotion-aware speech.
- Continuous dialogue.

---

## Module 9 — Language, Location and Context Tools

### Frontend

- Detect device language.
- Manual language selection.
- Manual city selection.
- Optional automatic location.
- Temperature-unit choice.
- Time-zone confirmation.
- Clear location-permission explanation.
- Right-to-left interface support.

### Backend

- Detect message language.
- Localize AI instructions.
- Retrieve weather.
- Cache weather by approximate area.
- Convert dates and times.
- Maintain location only at the required precision.
- Route current-information requests to search tools.
- Attach citations or source information where supported.

### Weather strategy

Start with a `WeatherProvider` adapter connected to WeatherAPI. Open-Meteo can be used for prototyping or later self-hosting, but its hosted free API is non-commercial.

---

## Module 10 — Personal Memory

### Frontend

- “Remember this” action.
- Memory centre.
- View stored memories.
- Edit memory.
- Delete memory.
- Pause memory.
- Clear all memory.
- Mark information as temporary.
- Show when memory influenced an answer.

### Backend

- Extract memory candidates.
- Classify memory sensitivity.
- Ask permission where necessary.
- Create embeddings.
- Retrieve only relevant memories.
- Apply expiry dates.
- Prevent prohibited information from being stored.
- Record why and when a memory was used.

### Memory types

```text
Preference
Goal
Routine
Long-term project
Important person
Important date
Communication preference
Temporary context
```

### Memory storage

```text
memories
- id
- user_id
- content_encrypted
- type
- importance
- sensitivity
- embedding
- source_message_id
- consent_status
- expires_at
- created_at
- deleted_at
```

---

## Module 11 — Image Advice and Private Media

### Frontend

- Take photo.
- Choose from gallery.
- Crop and compress.
- Remove metadata.
- Preview image.
- Ask a question.
- Receive structured advice.
- Save or delete result.
- Share approved image to community.

### Backend

- Issue signed upload URL.
- Validate file type and size.
- Run malware and image-safety checks.
- Strip sensitive metadata.
- Store image privately.
- Send temporary image access to AI.
- Generate advice.
- Apply retention period.
- Delete temporary files automatically.
- Require a separate action before community publication.

### Storage decision

Use **Cloudflare R2** through an S3-compatible `StorageProvider` interface.

---

## Module 12 — Reminders and Personal Planning

### Frontend

- Create reminder from chat.
- View daily plan.
- Edit reminder.
- Recurring reminders.
- Mark complete.
- Snooze.
- Notification preferences.
- Quiet hours.

### Backend

- Parse reminder intent.
- Confirm date and time.
- Store time zone.
- Schedule notification.
- Process recurring rules.
- Prevent duplicate reminders.
- Maintain delivery status.
- Respect quiet hours.

---

## Module 13 — Community and Social Profiles

### Frontend

- Community feed.
- Create post.
- Share an image after AI advice.
- Caption and topic.
- Public community profile.
- Follow and unfollow.
- Like and save.
- Comment and reply.
- Report.
- Block.
- Delete own post.
- Private-profile option.

### Backend

- Create post record.
- Moderate text and media.
- Generate safe media versions.
- Publish approved content.
- Retrieve interest-based feed.
- Manage follows and blocks.
- Store reactions and comments.
- Apply posting limits.
- Detect spam.
- Maintain post visibility.
- Soft-delete content.

### Initial feed

```text
Posts from followed users
+
Recent posts from selected interests
+
Popular approved posts
```

Do not build a complex recommendation algorithm during the MVP.

### Launch restriction

Do not include private messaging in the initial community release. It creates significantly more harassment, abuse and moderation risk without being essential to Velunee’s primary purpose.

---

## Module 14 — Trust, Safety and Moderation

### Frontend

- Report post.
- Report comment.
- Report account.
- Block account.
- Sensitive-content warning.
- Community guidelines.
- Moderation-status screen.
- Appeal process.

### Backend

- Text moderation.
- Image moderation.
- Spam and scam detection.
- Harassment detection.
- Duplicate-post detection.
- Risk scoring.
- Moderator queue.
- Warning system.
- Temporary restriction.
- Suspension and ban.
- Appeal processing.
- Moderator audit trail.

### Publication flow

```text
Upload
  ↓
Technical validation
  ↓
Malware scan
  ↓
Image and text moderation
  ↓
Risk classification
  ↓
Approved → Publish
Uncertain → Human review
Rejected → Inform user and allow appeal
```

---

## Module 15 — Notifications

### Frontend

- Push permission.
- Notification inbox.
- Read and unread status.
- Notification preferences.
- Deep links.
- Quiet hours.
- Category-level controls.

### Backend

- Device-token registration.
- Localized notification generation.
- Reminder delivery.
- Community notification delivery.
- Invalid-token cleanup.
- Delivery logging.
- Frequency limits.
- Notification preference enforcement.

---

## Module 16 — Subscription, Usage and Entitlements

### Frontend

- Current plan.
- Usage meter.
- Upgrade page.
- Restore purchases.
- Subscription status.
- Feature comparison.
- Renewal information.

### Backend

- Verify store purchases.
- Maintain entitlement status.
- Process subscription webhooks.
- Track AI and image usage.
- Enforce limits.
- Reset recurring allowances.
- Prevent client-side entitlement manipulation.
- Record billing events.

### Suggested plan structure

#### Velunee Free

- Basic text chat.
- Basic voice.
- Limited image advice.
- Basic memory.
- Community access.
- Daily or monthly usage limit.

#### Velunee Plus

- Higher limits.
- Better AI models.
- Extended memory.
- More image analysis.
- Advanced voice.
- Current-information tools.
- Personalized planning.

#### Velunee Premium

- Real-time voice.
- Highest-capability models.
- Larger memory allowance.
- Priority processing.
- Advanced personal agents.
- Premium community features.

---

## Module 17 — Privacy, Security and Data Rights

### Frontend

- Privacy dashboard.
- Permission management.
- Memory controls.
- Conversation deletion.
- Image-retention controls.
- Download user data.
- Delete account.
- Active-session management.
- Analytics preference.
- Blocked-users list.

### Backend

- Row-level data isolation.
- Role-based access.
- Encryption at rest and in transit.
- Field-level encryption for sensitive data.
- Signed media URLs.
- Secret management.
- Rate limiting.
- Data-retention jobs.
- Consent history.
- User-data export.
- Verified account deletion.
- Immutable security audit.
- Backup and recovery.

### Privacy classification

| Classification   | Examples                   | Treatment                       |
| ---------------- | -------------------------- | ------------------------------- |
| Public           | Published community post   | Public only after moderation    |
| Private          | Profile preferences        | User-only access                |
| Sensitive        | Memories, private images   | Encrypted, limited retention    |
| Highly sensitive | Credentials, payment data  | Do not store directly           |
| Operational      | Usage and latency          | Minimized and pseudonymized     |
| Audit            | Admin and security actions | Restricted and tamper-resistant |

### Non-negotiable rules

- Private AI conversations never become community content automatically.
- Personal memories never appear on public profiles.
- Precise location is not stored when city-level context is enough.
- Raw microphone recordings are not retained by default.
- User images are private unless explicitly published.
- AI providers receive only the minimum required context.
- Production conversations do not use AI plans that permit training on user data.
- Admin employees cannot browse private conversations without a controlled, logged support process.
- Deleting an account triggers database, media, memory and token cleanup.

---

## Module 18 — Admin, Support and Operations

### Admin frontend

- User search.
- Account status.
- Report queue.
- Post review.
- Appeal handling.
- AI prompt versions.
- Feature flags.
- Usage dashboards.
- Subscription status.
- Support tickets.
- Audit-log access.

### Backend

- Role-based administrator access.
- Two-factor authentication.
- Moderator permissions.
- Support-access approval.
- Prompt publishing.
- Feature-flag management.
- Moderation actions.
- Administrative audit records.
- Data export restrictions.

### Roles

```text
Super Administrator
Security Administrator
Operations Administrator
Content Moderator
Customer Support
AI Quality Manager
Analytics Viewer
```

---

## Module 19 — Analytics, AI Quality and Cost Control

### Frontend

- Rate response.
- Report incorrect answer.
- Report harmful answer.
- Submit product feedback.
- Optional satisfaction survey.

### Backend

Track non-sensitive operational measurements:

- Activation rate.
- Daily and monthly active users.
- Response latency.
- Error rate.
- AI cost per user.
- Positive-answer rate.
- Memory usefulness.
- Voice adoption.
- Image-analysis usage.
- Community report rate.
- Subscription conversion.
- Retention.
- Provider performance.

Full conversation content should not be copied into general analytics systems.

---

# 5. Final Technology Stack

| Layer            | Initial free/low-cost choice               | Premium or high-scale path                          |
| ---------------- | ------------------------------------------ | --------------------------------------------------- |
| Mobile           | Expo + React Native + TypeScript           | Same stack with paid EAS                            |
| Navigation       | Expo Router                                | Same                                                |
| UI               | NativeWind and reusable design system      | Internal Velunee UI package                         |
| Server state     | TanStack Query                             | Same                                                |
| Local state      | Zustand                                    | Same                                                |
| Forms            | React Hook Form + Zod                      | Same                                                |
| Admin portal     | Next.js + TypeScript                       | CDN and enterprise hosting                          |
| Backend          | NestJS modular monolith                    | Multiple NestJS services                            |
| API streaming    | SSE                                        | WebSocket/live service where required               |
| API hosting      | Google Cloud Run                           | Multiple regions, GKE or equivalent                 |
| Database         | Supabase PostgreSQL                        | Supabase Pro, RDS, Aurora, Cloud SQL or self-hosted |
| ORM              | Drizzle ORM                                | Same with managed migrations                        |
| Vector search    | pgvector                                   | Dedicated vector service only if required           |
| Authentication   | Supabase Auth                              | Cognito, Auth0 or self-hosted adapter               |
| File storage     | Cloudflare R2                              | Larger R2 deployment or another S3 provider         |
| Cache/rate limit | Upstash Redis                              | Fixed Redis, ElastiCache or Memorystore             |
| Initial jobs     | PostgreSQL outbox and scheduled worker     | Redis queue, RabbitMQ, NATS or Kafka                |
| AI               | Gemini through AI Gateway                  | Multi-provider model routing                        |
| Weather          | WeatherAPI adapter                         | Premium weather provider or self-hosted source      |
| Notifications    | Expo Push with FCM/APNs                    | Direct regional push infrastructure                 |
| Monitoring       | Structured logs and open-source monitoring | Managed observability platform                      |
| Repository       | GitHub + pnpm + Turborepo                  | Same with enterprise CI/CD                          |

---

# 6. Database Domain Layout

Use separate PostgreSQL schemas so modules remain logically independent.

```text
identity
├── users
├── profiles
├── preferences
├── sessions
├── consents
└── user_devices

assistant
├── conversations
├── messages
├── message_attachments
├── memories
├── memory_embeddings
├── tool_calls
├── model_usage
├── response_feedback
└── prompt_versions

planning
├── reminders
├── recurring_rules
├── reminder_deliveries
└── user_goals

community
├── public_profiles
├── topics
├── posts
├── post_media
├── comments
├── reactions
├── saves
├── follows
├── blocks
└── reports

moderation
├── content_checks
├── moderation_cases
├── actions
├── appeals
└── safety_rules

billing
├── plans
├── subscriptions
├── entitlements
├── usage_events
└── payment_events

operations
├── notifications
├── feature_flags
├── support_requests
├── provider_health
└── system_settings

audit
├── security_events
├── admin_actions
├── consent_history
└── deletion_jobs
```

All schema changes should be stored as migration files in source control.

---

# 7. Final Project Structure

```text
velunee/
│
├── apps/
│   ├── mobile/
│   ├── admin/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── ui/
│   ├── contracts/
│   ├── validation/
│   ├── database/
│   ├── auth-core/
│   ├── ai-core/
│   ├── storage-core/
│   ├── moderation-core/
│   ├── observability/
│   └── shared/
│
├── infrastructure/
│   ├── docker/
│   ├── cloud-run/
│   ├── database/
│   ├── monitoring/
│   └── scripts/
│
├── migrations/
├── tests/
├── docs/
└── .github/
    └── workflows/
```

---

# 8. Final Mobile Navigation

## Bottom navigation

```text
Home
Chat
Create
Community
Profile
```

## Home

- Greeting.
- Weather.
- Daily suggestions.
- Recent conversation.
- Reminders.
- Voice shortcut.

## Chat

- Text.
- Voice.
- Image.
- History.
- Saved answers.

## Create

- Image advice.
- Create community post.
- Create reminder.
- Create personal goal.

## Community

- Feed.
- Following.
- Topics.
- Saved posts.
- Notifications.

## Profile

- Personal preferences.
- Public profile.
- Memory.
- Subscription.
- Privacy.
- Security.
- Help.

---

# 9. Scaling Roadmap

## Stage 1 — Prototype

Suitable for internal testing.

```text
Expo Free
Cloud Run free allowance
Supabase Free
Cloudflare R2 Free
Upstash Redis Free
AI free tier using synthetic/non-sensitive data
```

## Stage 2 — Private Beta

Suitable for early invited users.

Changes:

- Paid AI data handling.
- Supabase Pro.
- Automated backups.
- Error monitoring.
- Moderation provider.
- Cloud Run production configuration.
- Budget alerts.
- Data-retention automation.

## Stage 3 — Public Launch

Changes:

- Multiple backend instances.
- Redis caching.
- Background-worker deployment.
- CDN image delivery.
- Read replicas where necessary.
- Dedicated moderation operations.
- Disaster-recovery testing.
- Regional performance monitoring.
- AI-provider fallback.
- Subscription infrastructure.

## Stage 4 — High Demand

Possible extracted services:

```text
AI Orchestration Service
Community Feed Service
Media Processing Service
Moderation Service
Notification Service
Search Service
Billing Service
Analytics Pipeline
```

Possible infrastructure:

- Multi-region API deployments.
- Managed PostgreSQL with replicas.
- Database partitioning.
- Dedicated Redis cluster.
- Event streaming.
- Regional media processing.
- Search index.
- Dedicated vector database only if pgvector is insufficient.

The mobile application remains largely unchanged because it continues communicating with the same versioned Velunee API.

---

# 10. Final Acceptance Decision

This final architecture meets Velunee’s requirements because it is:

- **AI-first:** Chat, voice, images, tools and memory are central.
- **Worldwide:** Language, location, time zone and weather are provider-independent.
- **Privacy-focused:** Private assistant data and public community data are separated.
- **Secure:** The client has no infrastructure secrets or direct administrative access.
- **Affordable initially:** Major services offer usable free or low-cost entry paths.
- **Commercially scalable:** Every major provider has a paid scaling route.
- **Portable:** PostgreSQL, NestJS, S3-compatible storage and provider interfaces minimize vendor lock-in.
- **Community-ready:** Image advice, controlled publishing, reporting and moderation are included.
- **Operationally manageable:** It starts as a modular monolith rather than unnecessary microservices.
- **Future-proof:** High-load modules can be separated without rebuilding the product.

## Final approved stack

```text
Mobile:
Expo + React Native + TypeScript

Admin:
Next.js + TypeScript

Backend:
NestJS modular monolith

Database:
PostgreSQL on Supabase initially

Database access:
Drizzle ORM with versioned migrations

Authentication:
Supabase Auth behind AuthProvider

Media:
Cloudflare R2 behind StorageProvider

Cache and rate limiting:
Upstash Redis

API hosting:
Google Cloud Run

AI:
Multi-provider AI Gateway
Gemini as initial provider

Weather:
WeatherProvider with WeatherAPI initially

Voice:
Device speech for MVP
Cloud real-time voice for premium

Security:
RLS + API authorization + encrypted sensitive fields
Signed media URLs + audit logging + strict retention

Architecture evolution:
Modular monolith → event-driven modules → selected microservices
```

**Final verdict: APPROVED FOR PRODUCT DESIGN AND MVP TECHNICAL PLANNING.**

---

# References

- Expo Documentation: https://docs.expo.dev/
- NestJS Documentation: https://docs.nestjs.com/
- Supabase Database Documentation: https://supabase.com/docs/guides/database/overview
- Supabase Self-Hosting: https://supabase.com/docs/guides/self-hosting
- Supabase Row-Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Cloudflare R2 Pricing: https://developers.cloudflare.com/r2/pricing/
- Google Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- WeatherAPI: https://www.weatherapi.com/
- Upstash Redis Documentation: https://upstash.com/docs/redis
- PostgreSQL Logical Replication: https://www.postgresql.org/docs/current/logical-replication.html
