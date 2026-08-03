import type { PlannerRepository, TaskRow } from './planner.repository';
import { PlannerService } from './planner.service';

const CREATED_AT = new Date('2026-08-03T06:00:00.000Z');

function row(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Prepare report',
    notes: null,
    dueOn: '2026-08-03',
    scheduledTime: '09:30',
    priority: 'medium',
    estimateMinutes: 30,
    status: 'todo',
    completedAt: null,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function buildRepository(): jest.Mocked<
  Pick<PlannerRepository, 'listForDay' | 'listOverdue' | 'create' | 'update' | 'softDelete'>
> {
  return {
    listForDay: jest.fn().mockResolvedValue([]),
    listOverdue: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

describe('PlannerService skipped lifecycle', () => {
  it('returns skipped tasks in the selected day without counting them as active work', async () => {
    const skippedAt = new Date('2026-08-03T07:15:00.000Z');
    const repository = buildRepository();
    repository.listForDay.mockResolvedValue([
      row(),
      row({
        id: '00000000-0000-4000-8000-000000000002',
        title: 'Call supplier',
        status: 'todo',
        completedAt: skippedAt,
      }),
    ]);
    const service = new PlannerService(repository as unknown as PlannerRepository);

    const response = await service.getDay('user-1', '2026-08-03');

    expect(response.tasks).toHaveLength(2);
    expect(response.tasks.find((task) => task.title === 'Call supplier')).toMatchObject({
      status: 'skipped',
      completedAt: null,
      skippedAt: skippedAt.toISOString(),
    });
    expect(response.load.taskCount).toBe(1);
  });

  it('stores Skip without deleting the task and returns its skipped timestamp', async () => {
    const repository = buildRepository();
    repository.update.mockImplementation(async (_userId, _taskId, patch) =>
      row({ status: patch.status ?? 'todo', completedAt: patch.completedAt ?? null }),
    );
    const service = new PlannerService(repository as unknown as PlannerRepository);

    const response = await service.updateTask('user-1', '00000000-0000-4000-8000-000000000001', {
      status: 'skipped',
    });

    expect(repository.softDelete).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-4000-8000-000000000001',
      { status: 'todo', completedAt: expect.any(Date) },
    );
    expect(response.task.status).toBe('skipped');
    expect(response.task.skippedAt).not.toBeNull();
  });

  it('restores a skipped task to an active todo state', async () => {
    const repository = buildRepository();
    repository.update.mockImplementation(async (_userId, _taskId, patch) =>
      row({ status: patch.status ?? 'todo', completedAt: patch.completedAt ?? null }),
    );
    const service = new PlannerService(repository as unknown as PlannerRepository);

    const response = await service.updateTask('user-1', '00000000-0000-4000-8000-000000000001', {
      status: 'todo',
    });

    expect(repository.update).toHaveBeenCalledWith(
      'user-1',
      '00000000-0000-4000-8000-000000000001',
      { status: 'todo', completedAt: null },
    );
    expect(response.task).toMatchObject({ status: 'todo', skippedAt: null });
  });
});
