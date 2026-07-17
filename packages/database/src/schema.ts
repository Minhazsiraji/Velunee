import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const identity = pgSchema('identity');
export const assistant = pgSchema('assistant');
export const planning = pgSchema('planning');
export const community = pgSchema('community');
export const moderation = pgSchema('moderation');
export const billing = pgSchema('billing');
export const operations = pgSchema('operations');
export const audit = pgSchema('audit');
export const finance = pgSchema('finance');
export const style = pgSchema('style');
export const learning = pgSchema('learning');

export const messageRole = pgEnum('message_role', ['user', 'assistant', 'system', 'tool']);
export const inputMode = pgEnum('input_mode', ['text', 'voice', 'image']);
export const memoryType = pgEnum('memory_type', [
  'preference',
  'goal',
  'routine',
  'project',
  'person',
  'date',
  'communication',
  'temporary',
]);
export const contentVisibility = pgEnum('content_visibility', ['private', 'followers', 'public']);
export const moderationStatus = pgEnum('moderation_status', [
  'pending',
  'approved',
  'review',
  'rejected',
]);

export const users = identity.table(
  'users',
  {
    id: uuid('id').primaryKey(),
    authProviderId: uuid('auth_provider_id').notNull(),
    email: varchar('email', { length: 320 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('users_auth_provider_id_uidx').on(table.authProviderId)],
);

export const profiles = identity.table('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 120 }),
  preferredLocale: varchar('preferred_locale', { length: 35 }).notNull().default('en'),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  countryCode: varchar('country_code', { length: 2 }),
  companionStyle: varchar('companion_style', { length: 40 }).notNull().default('warm'),
  profilePhotoKey: text('profile_photo_key'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const preferences = identity.table('preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  answerLength: varchar('answer_length', { length: 20 }).notNull().default('balanced'),
  voiceEnabled: boolean('voice_enabled').notNull().default(true),
  memoryEnabled: boolean('memory_enabled').notNull().default(true),
  analyticsEnabled: boolean('analytics_enabled').notNull().default(false),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const consents = identity.table(
  'consents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    consentType: varchar('consent_type', { length: 60 }).notNull(),
    version: varchar('version', { length: 30 }).notNull(),
    granted: boolean('granted').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('consents_user_id_idx').on(table.userId)],
);

export const conversations = assistant.table(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }),
    locale: varchar('locale', { length: 35 }),
    summaryEncrypted: text('summary_encrypted'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('conversations_user_updated_idx').on(table.userId, table.updatedAt)],
);

export const messages = assistant.table(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: messageRole('role').notNull(),
    inputMode: inputMode('input_mode').notNull().default('text'),
    contentEncrypted: text('content_encrypted').notNull(),
    provider: varchar('provider', { length: 50 }),
    model: varchar('model', { length: 120 }),
    requestId: varchar('request_id', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('messages_conversation_created_idx').on(table.conversationId, table.createdAt)],
);

export const memories = assistant.table(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: memoryType('type').notNull(),
    contentEncrypted: text('content_encrypted').notNull(),
    importance: integer('importance').notNull().default(1),
    sensitivity: varchar('sensitivity', { length: 30 }).notNull().default('private'),
    consentStatus: varchar('consent_status', { length: 30 }).notNull().default('pending'),
    sourceMessageId: uuid('source_message_id').references(() => messages.id, {
      onDelete: 'set null',
    }),
    enabled: boolean('enabled').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    allowedFeatures: jsonb('allowed_features')
      .$type<string[]>()
      .notNull()
      .default(['chat', 'home']),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('memories_user_type_idx').on(table.userId, table.type)],
);

export const modelUsage = assistant.table(
  'model_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    requestId: varchar('request_id', { length: 100 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    model: varchar('model', { length: 120 }).notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    latencyMs: integer('latency_ms').notNull(),
    estimatedCostUsd: real('estimated_cost_usd'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('model_usage_request_uidx').on(table.requestId)],
);

export const reminders = planning.table(
  'reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 240 }).notNull(),
    notesEncrypted: text('notes_encrypted'),
    timezone: varchar('timezone', { length: 100 }).notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    recurrenceRule: text('recurrence_rule'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('reminders_user_due_idx').on(table.userId, table.dueAt)],
);

export const publicProfiles = community.table('public_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  handle: varchar('handle', { length: 40 }).notNull(),
  bio: varchar('bio', { length: 300 }),
  isPrivate: boolean('is_private').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = community.table(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caption: varchar('caption', { length: 2200 }),
    visibility: contentVisibility('visibility').notNull().default('public'),
    moderationStatus: moderationStatus('moderation_status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('posts_status_created_idx').on(table.moderationStatus, table.createdAt)],
);

export const reactionType = pgEnum('reaction_type', ['heart', 'love']);

export const reactions = community.table(
  'reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: reactionType('type').notNull().default('heart'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reactions_post_user_type_uidx').on(table.postId, table.userId, table.type),
    index('reactions_post_idx').on(table.postId),
  ],
);

export const comments = community.table(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: varchar('body', { length: 2200 }).notNull(),
    moderationStatus: moderationStatus('moderation_status').notNull().default('approved'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('comments_post_created_idx').on(table.postId, table.createdAt)],
);

export const follows = community.table(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })],
);

export const contentChecks = moderation.table(
  'content_checks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectType: varchar('subject_type', { length: 30 }).notNull(),
    subjectId: uuid('subject_id').notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    decision: moderationStatus('decision').notNull(),
    riskScore: real('risk_score').notNull(),
    categories: jsonb('categories').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('content_checks_subject_idx').on(table.subjectType, table.subjectId)],
);

export const plans = billing.table('plans', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  entitlements: jsonb('entitlements').$type<Record<string, number | boolean>>().notNull(),
  active: boolean('active').notNull().default(true),
});

export const usageEvents = billing.table(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    feature: varchar('feature', { length: 80 }).notNull(),
    units: integer('units').notNull().default(1),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('usage_events_user_feature_idx').on(table.userId, table.feature, table.occurredAt),
  ],
);

export const featureFlags = operations.table('feature_flags', {
  key: varchar('key', { length: 120 }).primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  rules: jsonb('rules').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transactionKind = pgEnum('transaction_kind', ['income', 'expense']);
export const paymentMethod = pgEnum('payment_method', ['cash', 'card', 'mobile', 'bank', 'other']);

// Amounts are stored as integer minor units (e.g. poisha for BDT) so every
// balance calculation stays exact — no floating point drift.
export const moneyProfiles = finance.table('money_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('BDT'),
  monthlyIncomeMinor: bigint('monthly_income_minor', { mode: 'number' }).notNull().default(0),
  fixedExpensesMinor: bigint('fixed_expenses_minor', { mode: 'number' }).notNull().default(0),
  savingsTargetMinor: bigint('savings_target_minor', { mode: 'number' }).notNull().default(0),
  configuredAt: timestamp('configured_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// user_id null marks a shared system category available to everyone.
export const moneyCategories = finance.table(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 60 }).notNull(),
    icon: varchar('icon', { length: 40 }).notNull().default('pricetag'),
    isFixed: boolean('is_fixed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('categories_user_idx').on(table.userId)],
);

export const moneyTransactions = finance.table(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: transactionKind('kind').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 }).notNull().default('BDT'),
    categoryId: uuid('category_id').references(() => moneyCategories.id, {
      onDelete: 'set null',
    }),
    note: varchar('note', { length: 240 }),
    paymentMethod: paymentMethod('payment_method').notNull().default('cash'),
    occurredOn: date('occurred_on').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('transactions_user_occurred_idx').on(table.userId, table.occurredOn)],
);

export const moneyBudgets = finance.table(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => moneyCategories.id, { onDelete: 'cascade' }),
    month: varchar('month', { length: 7 }).notNull(),
    limitMinor: bigint('limit_minor', { mode: 'number' }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('budgets_user_category_month_uidx').on(table.userId, table.categoryId, table.month),
  ],
);

export const savingsGoals = finance.table(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    targetMinor: bigint('target_minor', { mode: 'number' }).notNull(),
    savedMinor: bigint('saved_minor', { mode: 'number' }).notNull().default(0),
    monthlyContributionMinor: bigint('monthly_contribution_minor', { mode: 'number' })
      .notNull()
      .default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    achievedAt: timestamp('achieved_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('savings_goals_user_idx').on(table.userId)],
);

export const recurringBills = finance.table(
  'recurring_bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    dueDay: integer('due_day').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('recurring_bills_user_idx').on(table.userId)],
);

export const fixedCosts = finance.table(
  'fixed_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 60 }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('fixed_costs_user_idx').on(table.userId)],
);

export const wardrobeCategory = pgEnum('wardrobe_category', [
  'top',
  'bottom',
  'dress',
  'outerwear',
  'shoes',
  'accessory',
]);
export const garmentWarmth = pgEnum('garment_warmth', ['light', 'medium', 'warm']);
export const garmentFormality = pgEnum('garment_formality', ['casual', 'smart', 'formal']);

export const wardrobeItems = style.table(
  'wardrobe_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    category: wardrobeCategory('category').notNull(),
    color: varchar('color', { length: 40 }).notNull().default('neutral'),
    warmth: garmentWarmth('warmth').notNull().default('medium'),
    formality: garmentFormality('formality').notNull().default('casual'),
    notes: varchar('notes', { length: 240 }),
    timesWorn: integer('times_worn').notNull().default(0),
    lastWornOn: date('last_worn_on'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('wardrobe_items_user_idx').on(table.userId, table.category)],
);

export const outfits = style.table(
  'outfits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    itemIds: jsonb('item_ids').$type<string[]>().notNull().default([]),
    occasion: varchar('occasion', { length: 40 }).notNull().default('casual'),
    isFavorite: boolean('is_favorite').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('outfits_user_idx').on(table.userId)],
);

export const learnerLevel = pgEnum('learner_level', ['beginner', 'intermediate', 'advanced']);
export const explanationStyle = pgEnum('explanation_style', [
  'simple',
  'step_by_step',
  'exam_focused',
]);
export const studyStatus = pgEnum('study_status', ['learning', 'reviewing', 'mastered']);

export const learnerProfiles = learning.table('learner_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  country: varchar('country', { length: 60 }),
  curriculum: varchar('curriculum', { length: 80 }),
  grade: varchar('grade', { length: 40 }),
  subject: varchar('subject', { length: 60 }),
  language: varchar('language', { length: 35 }).notNull().default('en'),
  level: learnerLevel('level').notNull().default('beginner'),
  explanationStyle: explanationStyle('explanation_style').notNull().default('simple'),
  examDate: date('exam_date'),
  configuredAt: timestamp('configured_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const studyTopics = learning.table(
  'study_topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subject: varchar('subject', { length: 60 }).notNull(),
    topic: varchar('topic', { length: 120 }).notNull(),
    status: studyStatus('status').notNull().default('learning'),
    note: varchar('note', { length: 240 }),
    lastReviewedOn: date('last_reviewed_on'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('study_topics_user_idx').on(table.userId, table.status)],
);

export const blocks = community.table(
  'blocks',
  {
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index('blocks_blocked_idx').on(table.blockedId),
  ],
);

export const reports = community.table(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    reason: varchar('reason', { length: 30 }).notNull(),
    note: varchar('note', { length: 300 }),
    status: varchar('status', { length: 20 }).notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('reports_reporter_post_uidx').on(table.reporterId, table.postId),
    index('reports_post_idx').on(table.postId),
  ],
);

export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high']);
export const taskStatus = pgEnum('task_status', ['todo', 'done']);

export const tasks = planning.table(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    notes: varchar('notes', { length: 500 }),
    dueOn: date('due_on').notNull(),
    scheduledTime: varchar('scheduled_time', { length: 5 }),
    priority: taskPriority('priority').notNull().default('medium'),
    estimateMinutes: integer('estimate_minutes'),
    status: taskStatus('status').notNull().default('todo'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('tasks_user_due_idx').on(table.userId, table.dueOn)],
);

export const securityEvents = audit.table(
  'security_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('security_events_type_time_idx').on(table.eventType, table.occurredAt)],
);
