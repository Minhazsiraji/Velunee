import { z } from 'zod';

export const inputModeSchema = z.enum(['text', 'voice', 'image']);

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.string().datetime(),
  inputMode: inputModeSchema.default('text'),
});

export const chatHistoryResponseSchema = z.object({
  conversationId: z.string().uuid().nullable(),
  messages: z.array(chatMessageSchema),
});

export const conversationListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  preview: z.string(),
  messageCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const conversationListResponseSchema = z.object({
  conversations: z.array(conversationListItemSchema),
});

export const conversationHistoryResponseSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(chatMessageSchema),
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const conversationMutationResponseSchema = z.object({
  conversationId: z.string().uuid(),
});

export const sendChatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(12_000),
  locale: z.string().trim().min(2).max(35).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  inputMode: inputModeSchema.default('text'),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4_000),
      }),
    )
    .max(20)
    .optional(),
});

export const chatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  message: chatMessageSchema,
  provider: z.string(),
  model: z.string(),
  requestId: z.string(),
});

export const streamChunkSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('meta'),
    conversationId: z.string().uuid(),
    requestId: z.string(),
  }),
  z.object({ type: z.literal('delta'), delta: z.string() }),
  z.object({
    type: z.literal('done'),
    messageId: z.string(),
    provider: z.string(),
    model: z.string(),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

export const companionStyleSchema = z.enum(['warm', 'concise', 'playful', 'professional']);

export const answerLengthSchema = z.enum(['short', 'balanced', 'detailed']);

export const accountProfileSchema = z.object({
  displayName: z.string().max(120).nullable(),
  preferredLocale: z.string().min(2).max(35),
  timezone: z.string().min(1).max(100),
  companionStyle: companionStyleSchema,
  email: z.string().email().nullable(),
  isAnonymous: z.boolean(),
});

export const accountPreferencesSchema = z.object({
  answerLength: answerLengthSchema,
  voiceEnabled: z.boolean(),
  memoryEnabled: z.boolean(),
  analyticsEnabled: z.boolean(),
});

export const accountOverviewResponseSchema = z.object({
  profile: accountProfileSchema,
  preferences: accountPreferencesSchema,
  stats: z.object({
    conversationCount: z.number().int().nonnegative(),
  }),
});

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().max(120).nullish(),
    preferredLocale: z.string().trim().min(2).max(35).optional(),
    timezone: z.string().trim().min(1).max(100).optional(),
    companionStyle: companionStyleSchema.optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export const updatePreferencesSchema = z
  .object({
    answerLength: answerLengthSchema.optional(),
    voiceEnabled: z.boolean().optional(),
    memoryEnabled: z.boolean().optional(),
    analyticsEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export const deleteAccountResponseSchema = z.object({
  deleted: z.literal(true),
});

export const reactionKindSchema = z.enum(['heart', 'love']);

export const communityPostSchema = z.object({
  id: z.string().uuid(),
  authorName: z.string(),
  authorHandle: z.string().nullable(),
  caption: z.string(),
  isOwnPost: z.boolean(),
  reactionCount: z.number().int().nonnegative(),
  viewerHasReacted: z.boolean(),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export const communityFeedResponseSchema = z.object({
  posts: z.array(communityPostSchema),
  nextCursor: z.string().datetime().nullable(),
});

export const createPostSchema = z.object({
  caption: z.string().trim().min(1).max(2_200),
});

export const reactionStateSchema = z.object({
  postId: z.string().uuid(),
  reactionCount: z.number().int().nonnegative(),
  viewerHasReacted: z.boolean(),
});

export const createPostResponseSchema = z.object({
  post: communityPostSchema,
  underReview: z.boolean(),
});

export const moderationQueueItemSchema = z.object({
  id: z.string().uuid(),
  authorName: z.string(),
  caption: z.string(),
  status: z.enum(['pending', 'review']),
  categories: z.array(z.string()),
  riskScore: z.number(),
  createdAt: z.string().datetime(),
});

export const moderationQueueResponseSchema = z.object({
  posts: z.array(moderationQueueItemSchema),
});

export const moderationActionResponseSchema = z.object({
  postId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
});

export const visionModeSchema = z.enum(['selfie', 'outfit', 'general']);

export const visionRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  imageBase64: z.string().min(1).max(12_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  prompt: z.string().trim().max(2_000).optional(),
  mode: visionModeSchema.default('selfie'),
  locale: z.string().trim().min(2).max(35).optional(),
});

export const visionResponseSchema = z.object({
  conversationId: z.string().uuid(),
  userMessage: chatMessageSchema,
  message: chatMessageSchema,
  text: z.string(),
  provider: z.string(),
  model: z.string(),
  requestId: z.string(),
});

export const transcribeRequestSchema = z.object({
  audioBase64: z.string().min(1).max(12_000_000),
  mimeType: z.string().min(1).max(60),
  locale: z.string().trim().min(2).max(35).optional(),
});

export const transcribeResponseSchema = z.object({
  text: z.string(),
  requestId: z.string(),
});

export const systemConfigSchema = z.object({
  appName: z.string(),
  tagline: z.string(),
  apiVersion: z.string(),
  maintenanceMode: z.boolean(),
  minimumMobileVersion: z.string(),
  features: z.object({
    chat: z.boolean(),
    voice: z.boolean(),
    imageAdvice: z.boolean(),
    community: z.boolean(),
    memory: z.boolean(),
    balance: z.boolean(),
  }),
});

// ---------------------------------------------------------------------------
// Velunee Balance — money tracking, safe spending and savings planning.
// All amounts travel as integer minor units (poisha for BDT) so calculations
// stay deterministic end to end.
// ---------------------------------------------------------------------------

export const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code such as BDT');

export const minorAmountSchema = z.number().int().nonnegative().max(1_000_000_000_000);

export const positiveMinorAmountSchema = z.number().int().positive().max(1_000_000_000_000);

export const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');

export const isoDateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const balanceProfileSchema = z.object({
  currency: currencyCodeSchema,
  monthlyIncomeMinor: minorAmountSchema,
  fixedExpensesMinor: minorAmountSchema,
  savingsTargetMinor: minorAmountSchema,
  isConfigured: z.boolean(),
});

export const updateBalanceProfileSchema = z
  .object({
    currency: currencyCodeSchema.optional(),
    monthlyIncomeMinor: minorAmountSchema.optional(),
    fixedExpensesMinor: minorAmountSchema.optional(),
    savingsTargetMinor: minorAmountSchema.optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export const balanceProfileResponseSchema = z.object({
  profile: balanceProfileSchema,
});

export const balanceCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(40),
  isFixed: z.boolean(),
  isCustom: z.boolean(),
});

export const balanceCategoriesResponseSchema = z.object({
  categories: z.array(balanceCategorySchema),
});

export const createBalanceCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(40).optional(),
  isFixed: z.boolean().optional(),
});

export const balanceCategoryResponseSchema = z.object({
  category: balanceCategorySchema,
});

export const balanceTransactionKindSchema = z.enum(['income', 'expense']);

export const balancePaymentMethodSchema = z.enum(['cash', 'card', 'mobile', 'bank', 'other']);

export const balanceTransactionSchema = z.object({
  id: z.string().uuid(),
  kind: balanceTransactionKindSchema,
  amountMinor: positiveMinorAmountSchema,
  currency: currencyCodeSchema,
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string().nullable(),
  note: z.string().nullable(),
  paymentMethod: balancePaymentMethodSchema,
  occurredOn: isoDateOnlySchema,
  createdAt: z.string().datetime(),
});

export const createBalanceTransactionSchema = z.object({
  kind: balanceTransactionKindSchema.default('expense'),
  amountMinor: positiveMinorAmountSchema,
  categoryId: z.string().uuid().optional(),
  note: z.string().trim().max(240).optional(),
  paymentMethod: balancePaymentMethodSchema.default('cash'),
  occurredOn: isoDateOnlySchema.optional(),
});

export const balanceTransactionsResponseSchema = z.object({
  transactions: z.array(balanceTransactionSchema),
  nextCursor: z.string().datetime().nullable(),
});

export const balanceTransactionResponseSchema = z.object({
  transaction: balanceTransactionSchema,
});

export const balanceDeletedResponseSchema = z.object({
  deleted: z.literal(true),
});

export const parseSpendingSchema = z.object({
  text: z.string().trim().min(1).max(400),
  locale: z.string().trim().min(2).max(35).optional(),
});

export const parsedSpendingEntrySchema = z.object({
  kind: balanceTransactionKindSchema,
  amountMinor: positiveMinorAmountSchema,
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string().nullable(),
  note: z.string(),
});

export const parseSpendingResponseSchema = z.object({
  entries: z.array(parsedSpendingEntrySchema).max(5),
});

export const balanceInsightSchema = z.object({
  id: z.string(),
  tone: z.enum(['positive', 'neutral', 'warning']),
  message: z.string(),
});

export const upcomingBillSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  amountMinor: positiveMinorAmountSchema,
  dueDay: z.number().int().min(1).max(31),
  dueInDays: z.number().int().nonnegative(),
});

export const balanceBudgetStatusSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string(),
  limitMinor: minorAmountSchema,
  spentMinor: minorAmountSchema,
  usedPercent: z.number().int().nonnegative(),
});

export const moneyWeatherSchema = z.object({
  state: z.enum(['sunny', 'partly', 'cloudy', 'stormy']),
  message: z.string(),
});

export const recoveryPlanSchema = z.object({
  overspendMinor: positiveMinorAmountSchema,
  dailyCutMinor: minorAmountSchema,
  message: z.string(),
});

export const balanceOverviewResponseSchema = z.object({
  month: monthKeySchema,
  currency: currencyCodeSchema,
  isConfigured: z.boolean(),
  moneyWeather: moneyWeatherSchema,
  recovery: recoveryPlanSchema.nullable(),
  safetyDays: z.number().int().nonnegative().nullable(),
  totals: z.object({
    incomeMinor: minorAmountSchema,
    extraIncomeMinor: minorAmountSchema,
    spentMinor: minorAmountSchema,
    fixedReservedMinor: minorAmountSchema,
    variableSpentMinor: minorAmountSchema,
    savingsTargetMinor: minorAmountSchema,
    remainingMinor: z.number().int(),
  }),
  daily: z.object({
    daysInMonth: z.number().int().positive(),
    daysElapsed: z.number().int().nonnegative(),
    daysRemaining: z.number().int().nonnegative(),
    suggestedDailyLimitMinor: minorAmountSchema,
    spentTodayMinor: minorAmountSchema,
    safeToSpendTodayMinor: minorAmountSchema,
    averageDailySpendMinor: minorAmountSchema,
    projectedMonthEndBalanceMinor: z.number().int(),
  }),
  topCategories: z
    .array(
      z.object({
        categoryId: z.string().uuid().nullable(),
        name: z.string(),
        spentMinor: minorAmountSchema,
        sharePercent: z.number().int().nonnegative(),
      }),
    )
    .max(5),
  budgets: z.array(balanceBudgetStatusSchema),
  upcomingBills: z.array(upcomingBillSchema),
  insights: z.array(balanceInsightSchema),
  calculation: z.array(z.string()),
});

export const affordabilityRequestSchema = z.object({
  amountMinor: positiveMinorAmountSchema,
  note: z.string().trim().max(120).optional(),
});

export const affordabilityGoalImpactSchema = z.object({
  goalId: z.string().uuid(),
  name: z.string(),
  delayDays: z.number().int().positive(),
});

export const affordabilityResponseSchema = z.object({
  verdict: z.enum(['yes', 'careful', 'no']),
  title: z.string(),
  explanation: z.string(),
  goalImpacts: z.array(affordabilityGoalImpactSchema).max(3),
  calculation: z.array(z.string()),
});

export const setBalanceBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  month: monthKeySchema.optional(),
  limitMinor: minorAmountSchema,
});

export const balanceBudgetsResponseSchema = z.object({
  month: monthKeySchema,
  currency: currencyCodeSchema,
  budgets: z.array(balanceBudgetStatusSchema),
});

export const savingsGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  targetMinor: positiveMinorAmountSchema,
  savedMinor: minorAmountSchema,
  monthlyContributionMinor: minorAmountSchema,
  isAchieved: z.boolean(),
  estimatedMonthsRemaining: z.number().int().nonnegative().nullable(),
});

export const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetMinor: positiveMinorAmountSchema,
  savedMinor: minorAmountSchema.optional(),
  monthlyContributionMinor: minorAmountSchema.optional(),
});

export const contributeSavingsGoalSchema = z.object({
  amountMinor: positiveMinorAmountSchema,
});

export const savingsGoalsResponseSchema = z.object({
  currency: currencyCodeSchema,
  goals: z.array(savingsGoalSchema),
});

export const savingsGoalResponseSchema = z.object({
  goal: savingsGoalSchema,
});

export const createRecurringBillSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amountMinor: positiveMinorAmountSchema,
  dueDay: z.number().int().min(1).max(31),
});

export const recurringBillsResponseSchema = z.object({
  bills: z.array(upcomingBillSchema),
});

export const recurringBillResponseSchema = z.object({
  bill: upcomingBillSchema,
});

export const balanceReportResponseSchema = z.object({
  month: monthKeySchema,
  currency: currencyCodeSchema,
  incomeMinor: minorAmountSchema,
  spentMinor: minorAmountSchema,
  savedMinor: z.number().int(),
  savingsRatePercent: z.number().int(),
  averageDailySpendMinor: minorAmountSchema,
  highestSpendingDay: z
    .object({
      date: isoDateOnlySchema,
      spentMinor: minorAmountSchema,
    })
    .nullable(),
  byCategory: z.array(
    z.object({
      categoryId: z.string().uuid().nullable(),
      name: z.string(),
      spentMinor: minorAmountSchema,
      sharePercent: z.number().int().nonnegative(),
    }),
  ),
  byDay: z.array(
    z.object({
      date: isoDateOnlySchema,
      spentMinor: minorAmountSchema,
    }),
  ),
  previousMonth: z
    .object({
      month: monthKeySchema,
      spentMinor: minorAmountSchema,
      deltaMinor: z.number().int(),
    })
    .nullable(),
  calculation: z.array(z.string()),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatHistoryResponse = z.infer<typeof chatHistoryResponseSchema>;
export type ConversationListItem = z.infer<typeof conversationListItemSchema>;
export type ConversationListResponse = z.infer<typeof conversationListResponseSchema>;
export type ConversationHistoryResponse = z.infer<typeof conversationHistoryResponseSchema>;
export type RenameConversationInput = z.infer<typeof renameConversationSchema>;
export type ConversationMutationResponse = z.infer<typeof conversationMutationResponseSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type StreamChunk = z.infer<typeof streamChunkSchema>;
export type CompanionStyle = z.infer<typeof companionStyleSchema>;
export type AnswerLength = z.infer<typeof answerLengthSchema>;
export type AccountProfile = z.infer<typeof accountProfileSchema>;
export type AccountPreferences = z.infer<typeof accountPreferencesSchema>;
export type AccountOverviewResponse = z.infer<typeof accountOverviewResponseSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type DeleteAccountResponse = z.infer<typeof deleteAccountResponseSchema>;

export type ReactionKind = z.infer<typeof reactionKindSchema>;
export type CommunityPost = z.infer<typeof communityPostSchema>;
export type CommunityFeedResponse = z.infer<typeof communityFeedResponseSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type ReactionState = z.infer<typeof reactionStateSchema>;
export type CreatePostResponse = z.infer<typeof createPostResponseSchema>;
export type ModerationQueueItem = z.infer<typeof moderationQueueItemSchema>;
export type ModerationQueueResponse = z.infer<typeof moderationQueueResponseSchema>;
export type ModerationActionResponse = z.infer<typeof moderationActionResponseSchema>;
export type VisionMode = z.infer<typeof visionModeSchema>;
export type VisionRequestInput = z.infer<typeof visionRequestSchema>;
export type VisionResponse = z.infer<typeof visionResponseSchema>;
export type TranscribeRequestInput = z.infer<typeof transcribeRequestSchema>;
export type TranscribeResponse = z.infer<typeof transcribeResponseSchema>;

export type SystemConfig = z.infer<typeof systemConfigSchema>;

export type BalanceProfile = z.infer<typeof balanceProfileSchema>;
export type UpdateBalanceProfileInput = z.infer<typeof updateBalanceProfileSchema>;
export type BalanceProfileResponse = z.infer<typeof balanceProfileResponseSchema>;
export type BalanceCategory = z.infer<typeof balanceCategorySchema>;
export type BalanceCategoriesResponse = z.infer<typeof balanceCategoriesResponseSchema>;
export type CreateBalanceCategoryInput = z.infer<typeof createBalanceCategorySchema>;
export type BalanceCategoryResponse = z.infer<typeof balanceCategoryResponseSchema>;
export type BalanceTransactionKind = z.infer<typeof balanceTransactionKindSchema>;
export type BalancePaymentMethod = z.infer<typeof balancePaymentMethodSchema>;
export type BalanceTransaction = z.infer<typeof balanceTransactionSchema>;
export type CreateBalanceTransactionInput = z.infer<typeof createBalanceTransactionSchema>;
export type BalanceTransactionsResponse = z.infer<typeof balanceTransactionsResponseSchema>;
export type BalanceTransactionResponse = z.infer<typeof balanceTransactionResponseSchema>;
export type BalanceDeletedResponse = z.infer<typeof balanceDeletedResponseSchema>;
export type ParseSpendingInput = z.infer<typeof parseSpendingSchema>;
export type ParsedSpendingEntry = z.infer<typeof parsedSpendingEntrySchema>;
export type ParseSpendingResponse = z.infer<typeof parseSpendingResponseSchema>;
export type BalanceInsight = z.infer<typeof balanceInsightSchema>;
export type UpcomingBill = z.infer<typeof upcomingBillSchema>;
export type BalanceBudgetStatus = z.infer<typeof balanceBudgetStatusSchema>;
export type BalanceOverviewResponse = z.infer<typeof balanceOverviewResponseSchema>;
export type MoneyWeather = z.infer<typeof moneyWeatherSchema>;
export type RecoveryPlan = z.infer<typeof recoveryPlanSchema>;
export type AffordabilityRequestInput = z.infer<typeof affordabilityRequestSchema>;
export type AffordabilityGoalImpact = z.infer<typeof affordabilityGoalImpactSchema>;
export type AffordabilityResponse = z.infer<typeof affordabilityResponseSchema>;
export type SetBalanceBudgetInput = z.infer<typeof setBalanceBudgetSchema>;
export type BalanceBudgetsResponse = z.infer<typeof balanceBudgetsResponseSchema>;
export type SavingsGoal = z.infer<typeof savingsGoalSchema>;
export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type ContributeSavingsGoalInput = z.infer<typeof contributeSavingsGoalSchema>;
export type SavingsGoalsResponse = z.infer<typeof savingsGoalsResponseSchema>;
export type SavingsGoalResponse = z.infer<typeof savingsGoalResponseSchema>;
export type CreateRecurringBillInput = z.infer<typeof createRecurringBillSchema>;
export type RecurringBillsResponse = z.infer<typeof recurringBillsResponseSchema>;
export type RecurringBillResponse = z.infer<typeof recurringBillResponseSchema>;
export type BalanceReportResponse = z.infer<typeof balanceReportResponseSchema>;

// ---------------------------------------------------------------------------
// Velunee Home — the daily command centre. One endpoint composes the cards a
// user has enabled; every card degrades to null when its source is missing so
// the home screen always renders something useful.
// ---------------------------------------------------------------------------

export const homeCardPreferencesSchema = z.object({
  weather: z.boolean(),
  balance: z.boolean(),
  bills: z.boolean(),
  recentConversation: z.boolean(),
  suggestion: z.boolean(),
});

export const updateHomeCardsSchema = z
  .object({
    weather: z.boolean().optional(),
    balance: z.boolean().optional(),
    bills: z.boolean().optional(),
    recentConversation: z.boolean().optional(),
    suggestion: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Provide at least one card to update',
  });

export const homeCardsResponseSchema = z.object({
  cards: homeCardPreferencesSchema,
});

export const homeWeatherCardSchema = z.object({
  locationName: z.string(),
  temperatureC: z.number(),
  feelsLikeC: z.number().nullable(),
  condition: z.string().nullable(),
  advice: z.string().nullable(),
});

export const homeBalanceCardSchema = z.object({
  currency: currencyCodeSchema,
  isConfigured: z.boolean(),
  safeToSpendTodayMinor: minorAmountSchema,
  suggestedDailyLimitMinor: minorAmountSchema,
  remainingMinor: z.number().int(),
  daysRemaining: z.number().int().nonnegative(),
});

export const homeBillCardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  amountMinor: positiveMinorAmountSchema,
  currency: currencyCodeSchema,
  dueInDays: z.number().int().nonnegative(),
});

export const homeConversationCardSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  updatedAt: z.string().datetime(),
});

export const homeSuggestionSchema = z.object({
  id: z.string(),
  message: z.string(),
});

export const homeOverviewResponseSchema = z.object({
  greeting: z.object({
    title: z.string(),
    subtitle: z.string().nullable(),
  }),
  weather: homeWeatherCardSchema.nullable(),
  balance: homeBalanceCardSchema.nullable(),
  upcomingBill: homeBillCardSchema.nullable(),
  recentConversation: homeConversationCardSchema.nullable(),
  suggestion: homeSuggestionSchema.nullable(),
  cards: homeCardPreferencesSchema,
});

export type HomeCardPreferences = z.infer<typeof homeCardPreferencesSchema>;
export type UpdateHomeCardsInput = z.infer<typeof updateHomeCardsSchema>;
export type HomeCardsResponse = z.infer<typeof homeCardsResponseSchema>;
export type HomeWeatherCard = z.infer<typeof homeWeatherCardSchema>;
export type HomeBalanceCard = z.infer<typeof homeBalanceCardSchema>;
export type HomeBillCard = z.infer<typeof homeBillCardSchema>;
export type HomeConversationCard = z.infer<typeof homeConversationCardSchema>;
export type HomeSuggestion = z.infer<typeof homeSuggestionSchema>;
export type HomeOverviewResponse = z.infer<typeof homeOverviewResponseSchema>;

// ---------------------------------------------------------------------------
// Personal Memory Vault — what Velunee remembers, visible and controllable.
// Community is deliberately not a valid feature key: personal memories can
// never be used there, by construction.
// ---------------------------------------------------------------------------

export const memoryTypeSchema = z.enum([
  'preference',
  'goal',
  'routine',
  'project',
  'person',
  'date',
  'communication',
  'temporary',
]);

export const memoryFeatureSchema = z.enum(['chat', 'home', 'balance', 'style', 'learn']);

export const memoryItemSchema = z.object({
  id: z.string().uuid(),
  type: memoryTypeSchema,
  content: z.string(),
  enabled: z.boolean(),
  allowedFeatures: z.array(memoryFeatureSchema),
  source: z.enum(['chat', 'manual']),
  lastUsedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const memoriesResponseSchema = z.object({
  memories: z.array(memoryItemSchema),
});

export const createMemorySchema = z.object({
  type: memoryTypeSchema.default('preference'),
  content: z.string().trim().min(1).max(600),
  allowedFeatures: z.array(memoryFeatureSchema).min(1).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const updateMemorySchema = z
  .object({
    type: memoryTypeSchema.optional(),
    content: z.string().trim().min(1).max(600).optional(),
    enabled: z.boolean().optional(),
    allowedFeatures: z.array(memoryFeatureSchema).min(1).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export const memoryResponseSchema = z.object({
  memory: memoryItemSchema,
});

export const memoryDeletedResponseSchema = z.object({
  deleted: z.literal(true),
});

export const memoriesClearedResponseSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
});

export type MemoryType = z.infer<typeof memoryTypeSchema>;
export type MemoryFeature = z.infer<typeof memoryFeatureSchema>;
export type MemoryItem = z.infer<typeof memoryItemSchema>;
export type MemoriesResponse = z.infer<typeof memoriesResponseSchema>;
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
export type MemoryResponse = z.infer<typeof memoryResponseSchema>;
export type MemoryDeletedResponse = z.infer<typeof memoryDeletedResponseSchema>;
export type MemoriesClearedResponse = z.infer<typeof memoriesClearedResponseSchema>;

// ---------------------------------------------------------------------------
// Velunee Decide — the signature decision system (improvement outline §6).
// Every decision separates facts (considered), a recommendation, an
// alternative, the likely impact, and one concrete next action. Financial
// verdicts always come from the deterministic affordability engine.
// ---------------------------------------------------------------------------

export const decisionKindSchema = z.enum(['affordability', 'outfit', 'timing', 'general']);

export const decideNextActionKindSchema = z.enum([
  'add_expense',
  'open_balance',
  'ask_chat',
  'none',
]);

export const decideConsideredItemSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const decideNextActionSchema = z.object({
  label: z.string(),
  kind: decideNextActionKindSchema,
});

export const decideRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  locale: z.string().trim().min(2).max(35).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  today: isoDateOnlySchema.optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

export const decideResponseSchema = z.object({
  question: z.string(),
  kind: decisionKindSchema,
  recommendation: z.string(),
  reasoning: z.string(),
  considered: z.array(decideConsideredItemSchema),
  alternative: z.string().nullable(),
  impact: z.string().nullable(),
  nextAction: decideNextActionSchema.nullable(),
  affordability: affordabilityResponseSchema.nullable(),
  provider: z.string(),
  model: z.string(),
  requestId: z.string(),
});

export type DecisionKind = z.infer<typeof decisionKindSchema>;
export type DecideNextActionKind = z.infer<typeof decideNextActionKindSchema>;
export type DecideConsideredItem = z.infer<typeof decideConsideredItemSchema>;
export type DecideNextAction = z.infer<typeof decideNextActionSchema>;
export type DecideRequestInput = z.infer<typeof decideRequestSchema>;
export type DecideResponse = z.infer<typeof decideResponseSchema>;

// ---------------------------------------------------------------------------
// Velunee Style — a digital wardrobe with weather- and occasion-aware outfit
// suggestions (improvement outline §14). No beauty scores, ever: guidance is
// about coordination, appropriateness and comfort.
// ---------------------------------------------------------------------------

export const wardrobeCategorySchema = z.enum([
  'top',
  'bottom',
  'dress',
  'outerwear',
  'shoes',
  'accessory',
]);
export const garmentWarmthSchema = z.enum(['light', 'medium', 'warm']);
export const garmentFormalitySchema = z.enum(['casual', 'smart', 'formal']);
export const styleOccasionSchema = z.enum(['casual', 'work', 'formal', 'party', 'travel']);

export const wardrobeItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  category: wardrobeCategorySchema,
  color: z.string().min(1).max(40),
  warmth: garmentWarmthSchema,
  formality: garmentFormalitySchema,
  notes: z.string().nullable(),
  timesWorn: z.number().int().nonnegative(),
  lastWornOn: isoDateOnlySchema.nullable(),
  createdAt: z.string().datetime(),
});

export const wardrobeItemsResponseSchema = z.object({
  items: z.array(wardrobeItemSchema),
});

export const createWardrobeItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: wardrobeCategorySchema,
  color: z.string().trim().min(1).max(40).optional(),
  warmth: garmentWarmthSchema.optional(),
  formality: garmentFormalitySchema.optional(),
  notes: z.string().trim().max(240).optional(),
});

export const updateWardrobeItemSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    category: wardrobeCategorySchema.optional(),
    color: z.string().trim().min(1).max(40).optional(),
    warmth: garmentWarmthSchema.optional(),
    formality: garmentFormalitySchema.optional(),
    notes: z.string().trim().max(240).nullish(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: 'Provide at least one field to update',
  });

export const wardrobeItemResponseSchema = z.object({
  item: wardrobeItemSchema,
});

export const styleDeletedResponseSchema = z.object({
  deleted: z.literal(true),
});

export const outfitPieceSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string(),
  category: wardrobeCategorySchema,
  color: z.string(),
});

export const suggestOutfitRequestSchema = z.object({
  occasion: styleOccasionSchema.default('casual'),
  temperatureC: z.number().min(-50).max(60).optional(),
  rain: z.boolean().optional(),
});

export const suggestOutfitResponseSchema = z.object({
  ok: z.boolean(),
  headline: z.string(),
  message: z.string(),
  pieces: z.array(outfitPieceSchema),
  missing: z.array(wardrobeCategorySchema),
  tips: z.array(z.string()),
});

export const saveOutfitSchema = z.object({
  name: z.string().trim().min(1).max(80),
  itemIds: z.array(z.string().uuid()).min(1).max(8),
  occasion: styleOccasionSchema.default('casual'),
});

export const savedOutfitSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  occasion: styleOccasionSchema,
  isFavorite: z.boolean(),
  pieces: z.array(outfitPieceSchema),
  createdAt: z.string().datetime(),
});

export const savedOutfitsResponseSchema = z.object({
  outfits: z.array(savedOutfitSchema),
});

export const savedOutfitResponseSchema = z.object({
  outfit: savedOutfitSchema,
});

export type WardrobeCategory = z.infer<typeof wardrobeCategorySchema>;
export type GarmentWarmth = z.infer<typeof garmentWarmthSchema>;
export type GarmentFormality = z.infer<typeof garmentFormalitySchema>;
export type StyleOccasion = z.infer<typeof styleOccasionSchema>;
export type WardrobeItem = z.infer<typeof wardrobeItemSchema>;
export type WardrobeItemsResponse = z.infer<typeof wardrobeItemsResponseSchema>;
export type CreateWardrobeItemInput = z.infer<typeof createWardrobeItemSchema>;
export type UpdateWardrobeItemInput = z.infer<typeof updateWardrobeItemSchema>;
export type WardrobeItemResponse = z.infer<typeof wardrobeItemResponseSchema>;
export type StyleDeletedResponse = z.infer<typeof styleDeletedResponseSchema>;
export type OutfitPiece = z.infer<typeof outfitPieceSchema>;
export type SuggestOutfitRequestInput = z.infer<typeof suggestOutfitRequestSchema>;
export type SuggestOutfitResponse = z.infer<typeof suggestOutfitResponseSchema>;
export type SaveOutfitInput = z.infer<typeof saveOutfitSchema>;
export type SavedOutfit = z.infer<typeof savedOutfitSchema>;
export type SavedOutfitsResponse = z.infer<typeof savedOutfitsResponseSchema>;
export type SavedOutfitResponse = z.infer<typeof savedOutfitResponseSchema>;
