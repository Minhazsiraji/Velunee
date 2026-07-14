import { visionResponseSchema, type VisionMode, type VisionResponse } from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export interface AnalyzeImageInput {
  conversationId?: string;
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  mode: VisionMode;
  prompt?: string;
}

export async function analyzeImage(input: AnalyzeImageInput): Promise<VisionResponse> {
  const payload = await apiRequest<unknown>('/chat/vision', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return visionResponseSchema.parse(payload);
}
