import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTaskInput, UpdateTaskInput } from '@velunee/contracts';

import { createTask, deleteTask, loadPlannerDay, updateTask } from './api';

const plannerKey = ['planner'] as const;

function useInvalidatePlanner(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: plannerKey });
  };
}

export function usePlannerDay(day?: string) {
  return useQuery({
    queryKey: [...plannerKey, 'day', day ?? 'today'],
    queryFn: () => loadPlannerDay(day),
  });
}

export function useCreateTask() {
  const invalidate = useInvalidatePlanner();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidatePlanner();
  return useMutation({
    mutationFn: (input: { taskId: string; patch: UpdateTaskInput }) =>
      updateTask(input.taskId, input.patch),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidatePlanner();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: invalidate,
  });
}
