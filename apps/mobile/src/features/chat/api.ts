import {
  chatHistoryResponseSchema,
  chatResponseSchema,
  type ChatHistoryResponse,
  type ChatResponse,
  type SendChatMessageInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadChatHistory(): Promise<ChatHistoryResponse> {
  const payload = await apiRequest<unknown>(
    '/chat/history',
  );

  return chatHistoryResponseSchema.parse(payload);
}

export async function sendChatMessage(
  input: SendChatMessageInput,
): Promise<ChatResponse> {
  const payload = await apiRequest<unknown>(
    '/chat/messages',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return chatResponseSchema.parse(payload);
}
