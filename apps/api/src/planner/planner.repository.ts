import { Inject, Injectable } from '@nestjs/common';
import type { TaskPriority, TaskStatus } from '@velunee/contracts';
import { tasks, users, type DatabaseConnection } from '@velunee/database';
import { and, eq, gte, isNull, lt, lte } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';

export interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  dueOn: string;
  scheduledTime: string | null;
  priority: TaskPriority;
  estimateMinutes: number | null;
  status: TaskStatus;
  createdAt: Date;
}

const NOT_CONFIGURED = 'Planner persistence is not configured';

const TASK_COLUMNS = {
  id: tasks.id,
  title: tasks.title,
  notes: tasks.notes,
  dueOn: tasks.dueOn,
  scheduledTime: tasks.scheduledTime,
  priority: tasks.priority,
  estimateMinutes: tasks.estimateMinutes,
  status: tasks.status,
  createdAt: tasks.createdAt,
} as const;

@Injectable()
export class PlannerRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
  ) {}

  private async ensureUser(userId: string): Promise<void> {
    if (!this.connection) return;
    await this.connection.db
      .insert(users)
      .values({ id: userId, authProviderId: userId })
      .onConflictDoNothing();
  }

  private map(row: {
    id: string;
    title: string;
    notes: string | null;
    dueOn: string;
    scheduledTime: string | null;
    priority: string;
    estimateMinutes: number | null;
    status: string;
    createdAt: Date;
  }): TaskRow {
    return {
      ...row,
      priority: row.priority as TaskPriority,
      status: row.status as TaskStatus,
    };
  }

  async listForDay(userId: string, day: string): Promise<TaskRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select(TASK_COLUMNS)
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), eq(tasks.dueOn, day)));
    return rows.map((row) => this.map(row));
  }

  async listOverdue(userId: string, today: string): Promise<TaskRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select(TASK_COLUMNS)
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          eq(tasks.status, 'todo'),
          lt(tasks.dueOn, today),
        ),
      );
    return rows.map((row) => this.map(row));
  }

  async listRange(userId: string, from: string, to: string): Promise<TaskRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select(TASK_COLUMNS)
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.deletedAt),
          gte(tasks.dueOn, from),
          lte(tasks.dueOn, to),
        ),
      );
    return rows.map((row) => this.map(row));
  }

  async create(
    userId: string,
    input: {
      title: string;
      notes: string | null;
      dueOn: string;
      scheduledTime: string | null;
      priority: TaskPriority;
      estimateMinutes: number | null;
    },
  ): Promise<TaskRow> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    await this.ensureUser(userId);
    const [row] = await this.connection.db
      .insert(tasks)
      .values({ userId, ...input })
      .returning(TASK_COLUMNS);
    if (!row) throw new Error('Task could not be saved');
    return this.map(row);
  }

  async update(
    userId: string,
    taskId: string,
    patch: Partial<{
      title: string;
      notes: string | null;
      dueOn: string;
      scheduledTime: string | null;
      priority: TaskPriority;
      estimateMinutes: number | null;
      status: TaskStatus;
      completedAt: Date | null;
    }>,
  ): Promise<TaskRow | null> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const [row] = await this.connection.db
      .update(tasks)
      .set(patch)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .returning(TASK_COLUMNS);
    return row ? this.map(row) : null;
  }

  async softDelete(userId: string, taskId: string): Promise<boolean> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const updated = await this.connection.db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .returning({ id: tasks.id });
    return updated.length > 0;
  }
}
