import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateTaskInput,
  PlannerDayResponse,
  PlannerDeletedResponse,
  PlannerTask,
  PlannerTaskResponse,
  UpdateTaskInput,
} from '@velunee/contracts';
import { isoDateOnlySchema } from '@velunee/contracts';
import { computeDayLoad, sortTasksForDay } from './planner.logic';
import { PlannerRepository, type TaskRow } from './planner.repository';

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class PlannerService {
  constructor(private readonly repository: PlannerRepository) {}

  private parseDay(day?: string): string {
    if (day === undefined || day === '') return isoToday();
    const result = isoDateOnlySchema.safeParse(day);
    if (!result.success) {
      throw new BadRequestException('day must use the YYYY-MM-DD format');
    }
    return result.data;
  }

  private toContract(row: TaskRow): PlannerTask {
    return {
      id: row.id,
      title: row.title,
      notes: row.notes,
      dueOn: row.dueOn,
      scheduledTime: row.scheduledTime,
      priority: row.priority,
      estimateMinutes: row.estimateMinutes,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getDay(userId: string, day?: string): Promise<PlannerDayResponse> {
    const resolvedDay = this.parseDay(day);
    const today = isoToday();

    const [dayRows, overdueRows] = await Promise.all([
      this.repository.listForDay(userId, resolvedDay),
      resolvedDay === today
        ? this.repository.listOverdue(userId, today)
        : Promise.resolve([] as TaskRow[]),
    ]);

    const tasks = sortTasksForDay(dayRows.map((row) => this.toContract(row)));
    const overdue = overdueRows
      .map((row) => this.toContract(row))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

    return {
      day: resolvedDay,
      tasks,
      overdue,
      load: computeDayLoad(tasks),
    };
  }

  async createTask(userId: string, input: CreateTaskInput): Promise<PlannerTaskResponse> {
    const row = await this.repository.create(userId, {
      title: input.title,
      notes: input.notes?.length ? input.notes : null,
      dueOn: input.dueOn ?? isoToday(),
      scheduledTime: input.scheduledTime ?? null,
      priority: input.priority,
      estimateMinutes: input.estimateMinutes ?? null,
    });
    return { task: this.toContract(row) };
  }

  async updateTask(
    userId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<PlannerTaskResponse> {
    const patch: Parameters<PlannerRepository['update']>[2] = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.notes !== undefined) patch.notes = input.notes?.length ? input.notes : null;
    if (input.dueOn !== undefined) patch.dueOn = input.dueOn;
    if (input.scheduledTime !== undefined) patch.scheduledTime = input.scheduledTime ?? null;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.estimateMinutes !== undefined) patch.estimateMinutes = input.estimateMinutes ?? null;
    if (input.status !== undefined) {
      patch.status = input.status;
      patch.completedAt = input.status === 'done' ? new Date() : null;
    }

    const row = await this.repository.update(userId, taskId, patch);
    if (!row) throw new NotFoundException('Task not found');
    return { task: this.toContract(row) };
  }

  async deleteTask(userId: string, taskId: string): Promise<PlannerDeletedResponse> {
    const deleted = await this.repository.softDelete(userId, taskId);
    if (!deleted) throw new NotFoundException('Task not found');
    return { deleted: true };
  }
}
