import type { PlannerTask } from '@velunee/contracts';
import { computeDayLoad, formatDuration, sortTasksForDay } from './planner.logic';

let seq = 0;
function task(overrides: Partial<PlannerTask>): PlannerTask {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    title: 'Task',
    notes: null,
    dueOn: '2026-07-16',
    scheduledTime: null,
    priority: 'medium',
    estimateMinutes: null,
    status: 'todo',
    createdAt: '2026-07-16T08:00:00.000Z',
    ...overrides,
  };
}

describe('sortTasksForDay', () => {
  it('puts scheduled tasks first in time order, then unscheduled by priority', () => {
    const sorted = sortTasksForDay([
      task({ title: 'Low unscheduled', priority: 'low' }),
      task({ title: 'Afternoon', scheduledTime: '15:00' }),
      task({ title: 'High unscheduled', priority: 'high' }),
      task({ title: 'Morning', scheduledTime: '09:00' }),
    ]);
    expect(sorted.map((t) => t.title)).toEqual([
      'Morning',
      'Afternoon',
      'High unscheduled',
      'Low unscheduled',
    ]);
  });
});

describe('formatDuration', () => {
  it('reads naturally', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(150)).toBe('2h 30m');
  });
});

describe('computeDayLoad', () => {
  it('is empty when nothing is planned', () => {
    const load = computeDayLoad([]);
    expect(load.taskCount).toBe(0);
    expect(load.overloaded).toBe(false);
    expect(load.message).toMatch(/nothing planned/i);
  });

  it('sums estimates and stays calm for a manageable day', () => {
    const load = computeDayLoad([task({ estimateMinutes: 60 }), task({ estimateMinutes: 90 })]);
    expect(load.totalMinutes).toBe(150);
    expect(load.overloaded).toBe(false);
    expect(load.message).toMatch(/manageable/i);
  });

  it('flags an overloaded day and suggests moving a task', () => {
    const heavy = Array.from({ length: 3 }, () => task({ estimateMinutes: 180 }));
    const load = computeDayLoad(heavy);
    expect(load.totalMinutes).toBe(540);
    expect(load.overloaded).toBe(true);
    expect(load.message).toMatch(/moving one lower-priority task/i);
  });

  it('uses a default estimate for tasks without one, and ignores done tasks', () => {
    const load = computeDayLoad([
      task({ estimateMinutes: null }),
      task({ status: 'done', estimateMinutes: 300 }),
    ]);
    expect(load.taskCount).toBe(1);
    expect(load.totalMinutes).toBe(30);
  });
});
