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

export const sendChatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(12_000),
  locale: z.string().trim().min(2).max(35).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  inputMode: inputModeSchema.default('text'),
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
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type StreamChunk = z.infer<typeof streamChunkSchema>;
export type SystemConfig = z.infer<typeof systemConfigSchema>;
