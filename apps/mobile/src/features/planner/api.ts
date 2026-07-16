import {
  plannerDayResponseSchema,
  plannerDeletedResponseSchema,
  plannerTaskResponseSchema,
  type CreateTaskInput,
  type PlannerDayResponse,
  type PlannerDeletedResponse,
  type PlannerTaskResponse,
  type UpdateTaskInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadPlannerDay(day?: string): Promise<PlannerDayResponse> {
  const query = day ? `?day=${encodeURIComponent(day)}` : '';
  const payload = await apiRequest<unknown>(`/planner/day${query}`);
  return plannerDayResponseSchema.parse(payload);
}

export async function createTask(input: CreateTaskInput): Promise<PlannerTaskResponse> {
  const payload = await apiRequest<unknown>('/planner/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return plannerTaskResponseSchema.parse(payload);
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<PlannerTaskResponse> {
  const payload = await apiRequest<unknown>(`/planner/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return plannerTaskResponseSchema.parse(payload);
}

export async function deleteTask(taskId: string): Promise<PlannerDeletedResponse> {
  const payload = await apiRequest<unknown>(`/planner/tasks/${taskId}`, { method: 'DELETE' });
  return plannerDeletedResponseSchema.parse(payload);
}
