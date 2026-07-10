import {
  chatResponseSchema,
  type ChatResponse,
  type SendChatMessageInput,
} from '@velunee/contracts';
import { apiRequest } from '@/lib/api';

export async function sendChatMessage(input: SendChatMessageInput): Promise<ChatResponse> {
  const payload = await apiRequest<unknown>('/chat/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return chatResponseSchema.parse(payload);
}
