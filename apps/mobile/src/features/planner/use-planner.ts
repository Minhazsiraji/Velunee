import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTaskInput, UpdateTaskInput } from '@velunee/contracts';

import { todayIso } from '@/features/balance/format';

import { createTask, deleteTask, loadPlannerDay, updateTask } from './api';

const plannerKey = ['planner'] as const;

function useRefreshPlanner(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: plannerKey,
        refetchType: 'all',
      }),
      queryClient.invalidateQueries({
        queryKey: ['reminders', 'planner-day'],
        refetchType: 'all',
      }),
    ]);
  };
}

export function usePlannerDay(day?: string) {
  const resolvedDay = day ?? todayIso();
  return useQuery({
    queryKey: [...plannerKey, 'day', resolvedDay],
    queryFn: () => loadPlannerDay(resolvedDay),
  });
}

export function useCreateTask() {
  const refresh = useRefreshPlanner();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: refresh,
  });
}

export function useUpdateTask() {
  const refresh = useRefreshPlanner();
  return useMutation({
    mutationFn: (input: { taskId: string; patch: UpdateTaskInput }) =>
      updateTask(input.taskId, input.patch),
    onSuccess: refresh,
  });
}

export function useDeleteTask() {
  const refresh = useRefreshPlanner();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: refresh,
  });
}
