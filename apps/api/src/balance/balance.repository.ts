import { Inject, Injectable } from '@nestjs/common';
import type {
  BalancePaymentMethod,
  BalanceTransactionKind,
} from '@velunee/contracts';
import {
  moneyBudgets,
  moneyCategories,
  moneyProfiles,
  moneyTransactions,
  recurringBills,
  savingsGoals,
  users,
  type DatabaseConnection,
} from '@velunee/database';
import { and, asc, desc, eq, gte, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';

export interface MoneyProfileRow {
  currencyCode: string;
  monthlyIncomeMinor: number;
  fixedExpensesMinor: number;
  savingsTargetMinor: number;
  configuredAt: Date | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  isFixed: boolean;
  isCustom: boolean;
}

export interface TransactionRow {
  id: string;
  kind: BalanceTransactionKind;
  amountMinor: number;
  currencyCode: string;
  categoryId: string | null;
  note: string | null;
  paymentMethod: BalancePaymentMethod;
  occurredOn: string;
  createdAt: Date;
}

export interface CategoryTotalRow {
  categoryId: string | null;
  totalMinor: number;
}

export interface DayTotalRow {
  date: string;
  totalMinor: number;
}

export interface BudgetRow {
  categoryId: string;
  limitMinor: number;
}

export interface GoalRow {
  id: string;
  name: string;
  targetMinor: number;
  savedMinor: number;
  monthlyContributionMinor: number;
  achievedAt: Date | null;
}

export interface BillRow {
  id: string;
  name: string;
  amountMinor: number;
  dueDay: number;
}

const NOT_CONFIGURED = 'Balance persistence is not configured';

@Injectable()
export class BalanceRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
  ) {}

  get enabled(): boolean {
    return this.connection !== null;
  }

  private async ensureUser(userId: string): Promise<void> {
    if (!this.connection) return;
    await this.connection.db
      .insert(users)
      .values({ id: userId, authProviderId: userId })
      .onConflictDoNothing();
  }

  async getProfile(userId: string): Promise<MoneyProfileRow | null> {
    if (!this.connection) return null;
    const [row] = await this.connection.db
      .select({
        currencyCode: moneyProfiles.currencyCode,
        monthlyIncomeMinor: moneyProfiles.monthlyIncomeMinor,
        fixedExpensesMinor: moneyProfiles.fixedExpensesMinor,
        savingsTargetMinor: moneyProfiles.savingsTargetMinor,
        configuredAt: moneyProfiles.configuredAt,
      })
      .from(moneyProfiles)
      .where(eq(moneyProfiles.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async upsertProfile(
    userId: string,
    patch: Partial<Omit<MoneyProfileRow, 'configuredAt'>>,
  ): Promise<void> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    await this.ensureUser(userId);
    const now = new Date();
    await this.connection.db
      .insert(moneyProfiles)
      .values({ userId, ...patch, configuredAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: moneyProfiles.userId,
        set: { ...patch, configuredAt: now, updatedAt: now },
      });
  }

  async listCategories(userId: string): Promise<CategoryRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select({
        id: moneyCategories.id,
        userId: moneyCategories.userId,
        name: moneyCategories.name,
        icon: moneyCategories.icon,
        isFixed: moneyCategories.isFixed,
      })
      .from(moneyCategories)
      .where(or(isNull(moneyCategories.userId), eq(moneyCategories.userId, userId)))
      .orderBy(asc(moneyCategories.name));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      isFixed: row.isFixed,
      isCustom: row.userId !== null,
    }));
  }

  async createCategory(
    userId: string,
    input: { name: string; icon: string; isFixed: boolean },
  ): Promise<CategoryRow> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    await this.ensureUser(userId);
    const [row] = await this.connection.db
      .insert(moneyCategories)
      .values({ userId, name: input.name, icon: input.icon, isFixed: input.isFixed })
      .returning({
        id: moneyCategories.id,
        name: moneyCategories.name,
        icon: moneyCategories.icon,
        isFixed: moneyCategories.isFixed,
      });
    if (!row) {
      throw new Error('Category could not be created');
    }
    return { ...row, isCustom: true };
  }

  async categoryExists(userId: string, categoryId: string): Promise<boolean> {
    if (!this.connection) return false;
    const [row] = await this.connection.db
      .select({ id: moneyCategories.id })
      .from(moneyCategories)
      .where(
        and(
          eq(moneyCategories.id, categoryId),
          or(isNull(moneyCategories.userId), eq(moneyCategories.userId, userId)),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async insertTransaction(
    userId: string,
    input: {
      kind: BalanceTransactionKind;
      amountMinor: number;
      currencyCode: string;
      categoryId: string | null;
      note: string | null;
      paymentMethod: BalancePaymentMethod;
      occurredOn: string;
    },
  ): Promise<TransactionRow> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    await this.ensureUser(userId);
    const [row] = await this.connection.db
      .insert(moneyTransactions)
      .values({ userId, ...input })
      .returning({
        id: moneyTransactions.id,
        createdAt: moneyTransactions.createdAt,
      });
    if (!row) {
      throw new Error('Transaction could not be recorded');
    }
    return { ...input, id: row.id, createdAt: row.createdAt };
  }

  async listTransactions(
    userId: string,
    options: { from: string; to: string; cursor?: string; limit: number },
  ): Promise<{ rows: TransactionRow[]; nextCursor: string | null }> {
    if (!this.connection) return { rows: [], nextCursor: null };

    const conditions = [
      eq(moneyTransactions.userId, userId),
      isNull(moneyTransactions.deletedAt),
      gte(moneyTransactions.occurredOn, options.from),
      lte(moneyTransactions.occurredOn, options.to),
    ];
    if (options.cursor) {
      conditions.push(lt(moneyTransactions.createdAt, new Date(options.cursor)));
    }

    const rows = await this.connection.db
      .select({
        id: moneyTransactions.id,
        kind: moneyTransactions.kind,
        amountMinor: moneyTransactions.amountMinor,
        currencyCode: moneyTransactions.currencyCode,
        categoryId: moneyTransactions.categoryId,
        note: moneyTransactions.note,
        paymentMethod: moneyTransactions.paymentMethod,
        occurredOn: moneyTransactions.occurredOn,
        createdAt: moneyTransactions.createdAt,
      })
      .from(moneyTransactions)
      .where(and(...conditions))
      .orderBy(desc(moneyTransactions.createdAt))
      .limit(options.limit + 1);

    const hasMore = rows.length > options.limit;
    const pageRows = hasMore ? rows.slice(0, options.limit) : rows;
    const nextCursor =
      hasMore && pageRows.length > 0
        ? pageRows[pageRows.length - 1]!.createdAt.toISOString()
        : null;

    return { rows: pageRows, nextCursor };
  }

  async softDeleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    const updated = await this.connection.db
      .update(moneyTransactions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(moneyTransactions.id, transactionId),
          eq(moneyTransactions.userId, userId),
          isNull(moneyTransactions.deletedAt),
        ),
      )
      .returning({ id: moneyTransactions.id });
    return updated.length > 0;
  }

  private async sumWhere(userId: string, extra: ReturnType<typeof and>): Promise<number> {
    if (!this.connection) return 0;
    const [row] = await this.connection.db
      .select({
        total: sql<string>`coalesce(sum(${moneyTransactions.amountMinor}), 0)`,
      })
      .from(moneyTransactions)
      .where(
        and(
          eq(moneyTransactions.userId, userId),
          isNull(moneyTransactions.deletedAt),
          extra,
        ),
      );
    return Number(row?.total ?? 0);
  }

  async sumByKind(
    userId: string,
    kind: BalanceTransactionKind,
    from: string,
    to: string,
  ): Promise<number> {
    return this.sumWhere(
      userId,
      and(
        eq(moneyTransactions.kind, kind),
        gte(moneyTransactions.occurredOn, from),
        lte(moneyTransactions.occurredOn, to),
      ),
    );
  }

  async spentByCategory(userId: string, from: string, to: string): Promise<CategoryTotalRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select({
        categoryId: moneyTransactions.categoryId,
        totalMinor: sql<string>`coalesce(sum(${moneyTransactions.amountMinor}), 0)`,
      })
      .from(moneyTransactions)
      .where(
        and(
          eq(moneyTransactions.userId, userId),
          eq(moneyTransactions.kind, 'expense'),
          isNull(moneyTransactions.deletedAt),
          gte(moneyTransactions.occurredOn, from),
          lte(moneyTransactions.occurredOn, to),
        ),
      )
      .groupBy(moneyTransactions.categoryId);

    return rows.map((row) => ({
      categoryId: row.categoryId,
      totalMinor: Number(row.totalMinor),
    }));
  }

  async spentByDay(userId: string, from: string, to: string): Promise<DayTotalRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select({
        date: moneyTransactions.occurredOn,
        totalMinor: sql<string>`coalesce(sum(${moneyTransactions.amountMinor}), 0)`,
      })
      .from(moneyTransactions)
      .where(
        and(
          eq(moneyTransactions.userId, userId),
          eq(moneyTransactions.kind, 'expense'),
          isNull(moneyTransactions.deletedAt),
          gte(moneyTransactions.occurredOn, from),
          lte(moneyTransactions.occurredOn, to),
        ),
      )
      .groupBy(moneyTransactions.occurredOn)
      .orderBy(asc(moneyTransactions.occurredOn));

    return rows.map((row) => ({ date: row.date, totalMinor: Number(row.totalMinor) }));
  }

  async expenseCount(userId: string, from: string, to: string): Promise<number> {
    if (!this.connection) return 0;
    const [row] = await this.connection.db
      .select({ value: sql<string>`count(*)` })
      .from(moneyTransactions)
      .where(
        and(
          eq(moneyTransactions.userId, userId),
          eq(moneyTransactions.kind, 'expense'),
          isNull(moneyTransactions.deletedAt),
          gte(moneyTransactions.occurredOn, from),
          lte(moneyTransactions.occurredOn, to),
        ),
      );
    return Number(row?.value ?? 0);
  }

  async budgetsForMonth(userId: string, month: string): Promise<BudgetRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select({
        categoryId: moneyBudgets.categoryId,
        limitMinor: moneyBudgets.limitMinor,
      })
      .from(moneyBudgets)
      .where(and(eq(moneyBudgets.userId, userId), eq(moneyBudgets.month, month)));
    return rows;
  }

  async upsertBudget(
    userId: string,
    categoryId: string,
    month: string,
    limitMinor: number,
  ): Promise<void> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    await this.ensureUser(userId);
    if (limitMinor === 0) {
      await this.connection.db
        .delete(moneyBudgets)
        .where(
          and(
            eq(moneyBudgets.userId, userId),
            eq(moneyBudgets.categoryId, categoryId),
            eq(moneyBudgets.month, month),
          ),
        );
      return;
    }
    await this.connection.db
      .insert(moneyBudgets)
      .values({ userId, categoryId, month, limitMinor })
      .onConflictDoUpdate({
        target: [moneyBudgets.userId, moneyBudgets.categoryId, moneyBudgets.month],
        set: { limitMinor, updatedAt: new Date() },
      });
  }

  async listGoals(userId: string): Promise<GoalRow[]> {
    if (!this.connection) return [];
    return this.connection.db
      .select({
        id: savingsGoals.id,
        name: savingsGoals.name,
        targetMinor: savingsGoals.targetMinor,
        savedMinor: savingsGoals.savedMinor,
        monthlyContributionMinor: savingsGoals.monthlyContributionMinor,
        achievedAt: savingsGoals.achievedAt,
      })
      .from(savingsGoals)
      .where(and(eq(savingsGoals.userId, userId), isNull(savingsGoals.deletedAt)))
      .orderBy(desc(savingsGoals.createdAt));
  }

  async createGoal(
    userId: string,
    input: {
      name: string;
      targetMinor: number;
      savedMinor: number;
      monthlyContributionMinor: number;
    },
  ): Promise<GoalRow> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    await this.ensureUser(userId);
    const achievedAt = input.savedMinor >= input.targetMinor ? new Date() : null;
    const [row] = await this.connection.db
      .insert(savingsGoals)
      .values({ userId, ...input, achievedAt })
      .returning({ id: savingsGoals.id });
    if (!row) {
      throw new Error('Savings goal could not be created');
    }
    return { id: row.id, achievedAt, ...input };
  }

  async contributeToGoal(
    userId: string,
    goalId: string,
    amountMinor: number,
  ): Promise<GoalRow | null> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    const [existing] = await this.connection.db
      .select({
        id: savingsGoals.id,
        name: savingsGoals.name,
        targetMinor: savingsGoals.targetMinor,
        savedMinor: savingsGoals.savedMinor,
        monthlyContributionMinor: savingsGoals.monthlyContributionMinor,
        achievedAt: savingsGoals.achievedAt,
      })
      .from(savingsGoals)
      .where(
        and(
          eq(savingsGoals.id, goalId),
          eq(savingsGoals.userId, userId),
          isNull(savingsGoals.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) return null;

    const savedMinor = existing.savedMinor + amountMinor;
    const achievedAt =
      existing.achievedAt ?? (savedMinor >= existing.targetMinor ? new Date() : null);

    await this.connection.db
      .update(savingsGoals)
      .set({ savedMinor, achievedAt })
      .where(eq(savingsGoals.id, goalId));

    return { ...existing, savedMinor, achievedAt };
  }

  async softDeleteGoal(userId: string, goalId: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    const updated = await this.connection.db
      .update(savingsGoals)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(savingsGoals.id, goalId),
          eq(savingsGoals.userId, userId),
          isNull(savingsGoals.deletedAt),
        ),
      )
      .returning({ id: savingsGoals.id });
    return updated.length > 0;
  }

  async listBills(userId: string): Promise<BillRow[]> {
    if (!this.connection) return [];
    return this.connection.db
      .select({
        id: recurringBills.id,
        name: recurringBills.name,
        amountMinor: recurringBills.amountMinor,
        dueDay: recurringBills.dueDay,
      })
      .from(recurringBills)
      .where(and(eq(recurringBills.userId, userId), isNull(recurringBills.deletedAt)))
      .orderBy(asc(recurringBills.dueDay));
  }

  async createBill(
    userId: string,
    input: { name: string; amountMinor: number; dueDay: number },
  ): Promise<BillRow> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    await this.ensureUser(userId);
    const [row] = await this.connection.db
      .insert(recurringBills)
      .values({ userId, ...input })
      .returning({ id: recurringBills.id });
    if (!row) {
      throw new Error('Bill could not be created');
    }
    return { id: row.id, ...input };
  }

  async softDeleteBill(userId: string, billId: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    const updated = await this.connection.db
      .update(recurringBills)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(recurringBills.id, billId),
          eq(recurringBills.userId, userId),
          isNull(recurringBills.deletedAt),
        ),
      )
      .returning({ id: recurringBills.id });
    return updated.length > 0;
  }
}
