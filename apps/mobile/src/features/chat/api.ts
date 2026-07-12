import {
  chatHistoryResponseSchema,
  chatResponseSchema,
  conversationHistoryResponseSchema,
  conversationListResponseSchema,
  type ChatHistoryResponse,
  type ChatResponse,
  type ConversationHistoryResponse,
  type ConversationListResponse,
  type SendChatMessageInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadChatHistory(): Promise<ChatHistoryResponse> {
  const payload = await apiRequest<unknown>(
    '/chat/history',
  );

  return chatHistoryResponseSchema.parse(payload);
}

export async function loadConversations(): Promise<ConversationListResponse> {
  const payload = await apiRequest<unknown>(
    '/chat/conversations',
  );

  return conversationListResponseSchema.parse(
    payload,
  );
}

export async function loadConversation(
  conversationId: string,
): Promise<ConversationHistoryResponse> {
  const payload = await apiRequest<unknown>(
    `/chat/conversations/${conversationId}`,
  );

  return conversationHistoryResponseSchema.parse(
    payload,
  );
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
