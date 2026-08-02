import type { PlannerTask } from '@velunee/contracts';

export type TaskTimingState =
  'untimed' | 'upcoming' | 'preparing' | 'due-now' | 'recent-overdue' | 'stale-overdue';

export interface TaskTiming {
  task: PlannerTask;
  state: TaskTimingState;
  minutesFromNow: number | null;
  scheduledAt: number | null;
}

const PREPARATION_WINDOW_MINUTES = 15;
const DUE_NOW_GRACE_MINUTES = 5;
const RECENT_OVERDUE_WINDOW_MINUTES = 60;

function localDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function scheduledTimestamp(task: PlannerTask): number | null {
  if (!task.scheduledTime) return null;
  const [year, month, day] = task.dueOn.split('-').map(Number) as [number, number, number];
  const [hour, minute] = task.scheduledTime.split(':').map(Number) as [number, number];
  return new Date(year, month - 1, day, hour, minute).getTime();
}

export function classifyTaskTiming(task: PlannerTask, now: Date): TaskTiming {
  const scheduledAt = scheduledTimestamp(task);

  if (scheduledAt === null) {
    return {
      task,
      state: task.dueOn < localDay(now) ? 'stale-overdue' : 'untimed',
      minutesFromNow: null,
      scheduledAt: null,
    };
  }

  const minutesFromNow = Math.ceil((scheduledAt - now.getTime()) / 60_000);
  let state: TaskTimingState;

  if (minutesFromNow > PREPARATION_WINDOW_MINUTES) state = 'upcoming';
  else if (minutesFromNow > 0) state = 'preparing';
  else if (minutesFromNow >= -DUE_NOW_GRACE_MINUTES) state = 'due-now';
  else if (minutesFromNow >= -RECENT_OVERDUE_WINDOW_MINUTES) state = 'recent-overdue';
  else state = 'stale-overdue';

  return { task, state, minutesFromNow, scheduledAt };
}

const ACTION_RANK: Record<TaskTimingState, number> = {
  'due-now': 0,
  'recent-overdue': 1,
  preparing: 2,
  upcoming: 3,
  untimed: 4,
  'stale-overdue': 5,
};

export function buildTaskTimings(tasks: PlannerTask[], now: Date): TaskTiming[] {
  return tasks
    .filter((task) => task.status === 'todo')
    .map((task) => classifyTaskTiming(task, now));
}

export function selectBestTaskTiming(timings: TaskTiming[]): TaskTiming | null {
  return (
    [...timings]
      .filter((timing) => timing.state !== 'stale-overdue')
      .sort((a, b) => {
        const rank = ACTION_RANK[a.state] - ACTION_RANK[b.state];
        if (rank !== 0) return rank;
        if (a.scheduledAt !== null && b.scheduledAt !== null) {
          return a.scheduledAt - b.scheduledAt;
        }
        if (a.scheduledAt !== null) return -1;
        if (b.scheduledAt !== null) return 1;
        return a.task.title.localeCompare(b.task.title);
      })[0] ?? null
  );
}

export function tomorrowIso(now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDay(tomorrow);
}
