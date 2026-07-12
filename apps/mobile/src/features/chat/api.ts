import {
  chatHistoryResponseSchema,
  chatResponseSchema,
  conversationHistoryResponseSchema,
  conversationListResponseSchema,
  conversationMutationResponseSchema,
  type ChatHistoryResponse,
  type ChatResponse,
  type ConversationHistoryResponse,
  type ConversationListResponse,
  type ConversationMutationResponse,
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

export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<ConversationMutationResponse> {
  const payload = await apiRequest<unknown>(
    `/chat/conversations/${conversationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    },
  );

  return conversationMutationResponseSchema.parse(
    payload,
  );
}

export async function deleteConversation(
  conversationId: string,
): Promise<ConversationMutationResponse> {
  const payload = await apiRequest<unknown>(
    `/chat/conversations/${conversationId}`,
    {
      method: 'DELETE',
    },
  );

  return conversationMutationResponseSchema.parse(
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
