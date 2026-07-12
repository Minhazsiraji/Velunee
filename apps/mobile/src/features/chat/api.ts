import {
  chatHistoryResponseSchema,
  chatResponseSchema,
  conversationHistoryResponseSchema,
  streamChunkSchema,
  conversationListResponseSchema,
  conversationMutationResponseSchema,
  type ChatHistoryResponse,
  type ChatResponse,
  type ConversationHistoryResponse,
  type ConversationListResponse,
  type ConversationMutationResponse,
  type SendChatMessageInput,
} from '@velunee/contracts';

import { ApiError, apiEventStream, apiRequest } from '@/lib/api';

export async function loadChatHistory(): Promise<ChatHistoryResponse> {
  const payload = await apiRequest<unknown>('/chat/history');

  return chatHistoryResponseSchema.parse(payload);
}

export async function loadConversations(): Promise<ConversationListResponse> {
  const payload = await apiRequest<unknown>('/chat/conversations');

  return conversationListResponseSchema.parse(payload);
}

export async function loadConversation(
  conversationId: string,
): Promise<ConversationHistoryResponse> {
  const payload = await apiRequest<unknown>(`/chat/conversations/${conversationId}`);

  return conversationHistoryResponseSchema.parse(payload);
}

export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<ConversationMutationResponse> {
  const payload = await apiRequest<unknown>(`/chat/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });

  return conversationMutationResponseSchema.parse(payload);
}

export async function deleteConversation(
  conversationId: string,
): Promise<ConversationMutationResponse> {
  const payload = await apiRequest<unknown>(`/chat/conversations/${conversationId}`, {
    method: 'DELETE',
  });

  return conversationMutationResponseSchema.parse(payload);
}

export interface ChatStreamHandlers {
  onMeta(input: { conversationId: string; requestId: string }): void;
  onDelta(delta: string): void;
  onDone(input: { messageId: string; provider: string; model: string }): void;
}

export async function streamChatMessage(
  input: SendChatMessageInput,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let completed = false;

  await apiEventStream(
    '/chat/stream',
    {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    },
    {
      onData: (data) => {
        let payload: unknown;

        try {
          payload = JSON.parse(data);
        } catch {
          throw new ApiError('Velunee received an invalid streamed response.', 502);
        }

        const event = streamChunkSchema.parse(payload);

        if (event.type === 'meta') {
          handlers.onMeta(event);
          return;
        }

        if (event.type === 'delta') {
          handlers.onDelta(event.delta);
          return;
        }

        if (event.type === 'done') {
          completed = true;
          handlers.onDone(event);
          return;
        }

        throw new ApiError(event.message, 502);
      },
    },
  );

  if (!completed) {
    throw new ApiError('The streamed response ended before completion.', 502);
  }
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<ChatResponse> {
  const payload = await apiRequest<unknown>('/chat/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return chatResponseSchema.parse(payload);
}
