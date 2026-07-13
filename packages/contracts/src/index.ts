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
  imageBase64: z.string().min(1).max(12_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  prompt: z.string().trim().max(2_000).optional(),
  mode: visionModeSchema.default('selfie'),
  locale: z.string().trim().min(2).max(35).optional(),
});

export const visionResponseSchema = z.object({
  text: z.string(),
  provider: z.string(),
  model: z.string(),
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
  }),
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

export type SystemConfig = z.infer<typeof systemConfigSchema>;
