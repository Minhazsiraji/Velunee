import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateMemoryInput, UpdateMemoryInput } from '@velunee/contracts';

import {
  clearAllMemories,
  createMemory,
  deleteMemory,
  loadMemories,
  updateMemory,
} from './api';

const memoryKey = ['memory'] as const;

function useInvalidateMemories(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: memoryKey });
  };
}

export function useMemories() {
  return useQuery({
    queryKey: [...memoryKey, 'list'],
    queryFn: () => loadMemories(),
  });
}

export function useCreateMemory() {
  const invalidate = useInvalidateMemories();
  return useMutation({
    mutationFn: (input: CreateMemoryInput) => createMemory(input),
    onSuccess: invalidate,
  });
}

export function useUpdateMemory() {
  const invalidate = useInvalidateMemories();
  return useMutation({
    mutationFn: (input: { memoryId: string; patch: UpdateMemoryInput }) =>
      updateMemory(input.memoryId, input.patch),
    onSuccess: invalidate,
  });
}

export function useDeleteMemory() {
  const invalidate = useInvalidateMemories();
  return useMutation({
    mutationFn: (memoryId: string) => deleteMemory(memoryId),
    onSuccess: invalidate,
  });
}

export function useClearAllMemories() {
  const invalidate = useInvalidateMemories();
  return useMutation({
    mutationFn: () => clearAllMemories(),
    onSuccess: invalidate,
  });
}
