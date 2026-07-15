import {
  memoriesClearedResponseSchema,
  memoriesResponseSchema,
  memoryDeletedResponseSchema,
  memoryResponseSchema,
  type CreateMemoryInput,
  type MemoriesClearedResponse,
  type MemoriesResponse,
  type MemoryDeletedResponse,
  type MemoryResponse,
  type UpdateMemoryInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadMemories(): Promise<MemoriesResponse> {
  const payload = await apiRequest<unknown>('/memory');
  return memoriesResponseSchema.parse(payload);
}

export async function createMemory(input: CreateMemoryInput): Promise<MemoryResponse> {
  const payload = await apiRequest<unknown>('/memory', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return memoryResponseSchema.parse(payload);
}

export async function updateMemory(
  memoryId: string,
  input: UpdateMemoryInput,
): Promise<MemoryResponse> {
  const payload = await apiRequest<unknown>(`/memory/${memoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return memoryResponseSchema.parse(payload);
}

export async function deleteMemory(memoryId: string): Promise<MemoryDeletedResponse> {
  const payload = await apiRequest<unknown>(`/memory/${memoryId}`, { method: 'DELETE' });
  return memoryDeletedResponseSchema.parse(payload);
}

export async function clearAllMemories(): Promise<MemoriesClearedResponse> {
  const payload = await apiRequest<unknown>('/memory', { method: 'DELETE' });
  return memoriesClearedResponseSchema.parse(payload);
}
