import type { PlannerDayLoad, PlannerTask } from '@velunee/contracts';

// A realistic active day and a sensible default when a task has no estimate.
export const CAPACITY_MINUTES = 8 * 60;
export const DEFAULT_ESTIMATE_MINUTES = 30;
const BUSY_TASK_COUNT = 8;

const PRIORITY_RANK: Record<PlannerTask['priority'], number> = { high: 0, medium: 1, low: 2 };

export function sortTasksForDay(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort((a, b) => {
    if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
    if (a.scheduledTime) return -1;
    if (b.scheduledTime) return 1;
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    }
    return a.title.localeCompare(b.title);
  });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// The "realistic day" guidance from §16: sums remaining work and gently
// suggests trimming when the day is overloaded — never nagging.
export function computeDayLoad(tasks: PlannerTask[]): PlannerDayLoad {
  const todo = tasks.filter((task) => task.status === 'todo');
  const totalMinutes = todo.reduce(
    (sum, task) => sum + (task.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES),
    0,
  );
  const taskCount = todo.length;
  const overloaded = totalMinutes > CAPACITY_MINUTES || taskCount > BUSY_TASK_COUNT;

  let message: string;
  if (taskCount === 0) {
    message = 'Nothing planned yet — add a task or two to shape your day.';
  } else if (overloaded) {
    message =
      `That's about ${formatDuration(totalMinutes)} of work across ${taskCount} tasks — a very full day. ` +
      'Moving one lower-priority task to another day would make it more realistic.';
  } else {
    message = `A manageable day: ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}, roughly ${formatDuration(totalMinutes)}.`;
  }

  return { totalMinutes, taskCount, overloaded, message };
}
