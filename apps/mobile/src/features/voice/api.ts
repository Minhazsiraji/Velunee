import {
  transcribeResponseSchema,
  type TranscribeResponse,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export interface TranscribeInput {
  audioBase64: string;
  mimeType: string;
  locale?: string;
}

export async function transcribeAudio(
  input: TranscribeInput,
): Promise<TranscribeResponse> {
  const payload = await apiRequest<unknown>('/chat/transcribe', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return transcribeResponseSchema.parse(payload);
}
