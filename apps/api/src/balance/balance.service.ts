import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BalanceBudgetStatus,
  BalanceBudgetsResponse,
  BalanceCategoriesResponse,
  BalanceCategoryResponse,
  BalanceDeletedResponse,
  BalanceInsight,
  BalanceOverviewResponse,
  BalanceProfile,
  BalanceProfileResponse,
  BalanceReportResponse,
  BalanceTransaction,
  BalanceTransactionResponse,
  BalanceTransactionsResponse,
  ContributeSavingsGoalInput,
  CreateBalanceCategoryInput,
  CreateBalanceTransactionInput,
  CreateRecurringBillInput,
  CreateSavingsGoalInput,
  ParseSpendingInput,
  ParseSpendingResponse,
  RecurringBillResponse,
  RecurringBillsResponse,
  SavingsGoal,
  SavingsGoalResponse,
  SavingsGoalsResponse,
  UpcomingBill,
  UpdateBalanceProfileInput,
} from '@velunee/contracts';
import { isoDateOnlySchema, monthKeySchema } from '@velunee/contracts';
import {
  computeOverviewNumbers,
  dueInDays,
  estimatedMonthsRemaining,
  formatMinor,
  previousMonthOf,
  resolveMonthWindow,
  type MonthWindow,
} from './balance.math';
import { parseSpendingText } from './balance.parser';
import {
  BalanceRepository,
  type CategoryRow,
  type GoalRow,
  type MoneyProfileRow,
  type TransactionRow,
} from './balance.repository';

const TRANSACTIONS_PAGE_SIZE = 30;
const UNCATEGORISED = 'Uncategorised';

const DEFAULT_PROFILE: MoneyProfileRow = {
  currencyCode: 'BDT',
  monthlyIncomeMinor: 0,
  fixedExpensesMinor: 0,
  savingsTargetMinor: 0,
  configuredAt: null,
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

@Injectable()
export class BalanceService {
  constructor(private readonly repository: BalanceRepository) {}

  private parseMonth(month?: string): string | undefined {
    if (month === undefined || month === '') return undefined;
    const result = monthKeySchema.safeParse(month);
    if (!result.success) {
      throw new BadRequestException('month must use the YYYY-MM format');
    }
    return result.data;
  }

  private parseToday(today?: string): string | undefined {
    if (today === undefined || today === '') return undefined;
    const result = isoDateOnlySchema.safeParse(today);
    if (!result.success) {
      throw new BadRequestException('today must use the YYYY-MM-DD format');
    }
    return result.data;
  }

  private async profileOrDefault(userId: string): Promise<MoneyProfileRow> {
    return (await this.repository.getProfile(userId)) ?? DEFAULT_PROFILE;
  }

  private toProfileContract(row: MoneyProfileRow): BalanceProfile {
    return {
      currency: row.currencyCode,
      monthlyIncomeMinor: row.monthlyIncomeMinor,
      fixedExpensesMinor: row.fixedExpensesMinor,
      savingsTargetMinor: row.savingsTargetMinor,
      isConfigured: row.configuredAt !== null,
    };
  }

  async getProfile(userId: string): Promise<BalanceProfileResponse> {
    const profile = await this.profileOrDefault(userId);
    return { profile: this.toProfileContract(profile) };
  }

  async updateProfile(
    userId: string,
    input: UpdateBalanceProfileInput,
  ): Promise<BalanceProfileResponse> {
    await this.repository.upsertProfile(userId, {
      ...(input.currency !== undefined ? { currencyCode: input.currency } : {}),
      ...(input.monthlyIncomeMinor !== undefined
        ? { monthlyIncomeMinor: input.monthlyIncomeMinor }
        : {}),
      ...(input.fixedExpensesMinor !== undefined
        ? { fixedExpensesMinor: input.fixedExpensesMinor }
        : {}),
      ...(input.savingsTargetMinor !== undefined
        ? { savingsTargetMinor: input.savingsTargetMinor }
        : {}),
    });
    return this.getProfile(userId);
  }

  async listCategories(userId: string): Promise<BalanceCategoriesResponse> {
    const categories = await this.repository.listCategories(userId);
    return { categories };
  }

  async createCategory(
    userId: string,
    input: CreateBalanceCategoryInput,
  ): Promise<BalanceCategoryResponse> {
    try {
      const category = await this.repository.createCategory(userId, {
        name: input.name,
        icon: input.icon ?? 'pricetag',
        isFixed: input.isFixed ?? false,
      });
      return { category };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('You already have a category with this name');
      }
      throw error;
    }
  }

  private toTransactionContract(
    row: TransactionRow,
    categoryNames: Map<string, string>,
  ): BalanceTransaction {
    return {
      id: row.id,
      kind: row.kind,
      amountMinor: row.amountMinor,
      currency: row.currencyCode,
      categoryId: row.categoryId,
      categoryName: row.categoryId ? (categoryNames.get(row.categoryId) ?? null) : null,
      note: row.note,
      paymentMethod: row.paymentMethod,
      occurredOn: row.occurredOn,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async categoryNameMap(userId: string): Promise<Map<string, string>> {
    const categories = await this.repository.listCategories(userId);
    return new Map(categories.map((category) => [category.id, category.name]));
  }

  async listTransactions(
    userId: string,
    options: { month?: string; today?: string; cursor?: string },
  ): Promise<BalanceTransactionsResponse> {
    const window = resolveMonthWindow(
      this.parseMonth(options.month),
      this.parseToday(options.today),
    );
    const [{ rows, nextCursor }, categoryNames] = await Promise.all([
      this.repository.listTransactions(userId, {
        from: window.from,
        to: window.to,
        cursor: options.cursor,
        limit: TRANSACTIONS_PAGE_SIZE,
      }),
      this.categoryNameMap(userId),
    ]);

    return {
      transactions: rows.map((row) => this.toTransactionContract(row, categoryNames)),
      nextCursor,
    };
  }

  async createTransaction(
    userId: string,
    input: CreateBalanceTransactionInput,
  ): Promise<BalanceTransactionResponse> {
    if (input.categoryId) {
      const exists = await this.repository.categoryExists(userId, input.categoryId);
      if (!exists) {
        throw new BadRequestException('Unknown category');
      }
    }

    const profile = await this.profileOrDefault(userId);
    const row = await this.repository.insertTransaction(userId, {
      kind: input.kind,
      amountMinor: input.amountMinor,
      currencyCode: profile.currencyCode,
      categoryId: input.categoryId ?? null,
      note: input.note?.length ? input.note : null,
      paymentMethod: input.paymentMethod,
      occurredOn: input.occurredOn ?? resolveMonthWindow().today,
    });

    const categoryNames = await this.categoryNameMap(userId);
    return { transaction: this.toTransactionContract(row, categoryNames) };
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<BalanceDeletedResponse> {
    const deleted = await this.repository.softDeleteTransaction(userId, transactionId);
    if (!deleted) {
      throw new NotFoundException('Transaction not found');
    }
    return { deleted: true };
  }

  async parseSpending(userId: string, input: ParseSpendingInput): Promise<ParseSpendingResponse> {
    const categories = await this.repository.listCategories(userId);
    const entries = parseSpendingText(input.text, categories);
    return { entries };
  }

  private async budgetStatuses(
    userId: string,
    window: MonthWindow,
    categories: CategoryRow[],
  ): Promise<BalanceBudgetStatus[]> {
    const [budgets, spentRows] = await Promise.all([
      this.repository.budgetsForMonth(userId, window.month),
      this.repository.spentByCategory(userId, window.from, window.to),
    ]);
    const names = new Map(categories.map((category) => [category.id, category.name]));
    const spentByCategory = new Map(spentRows.map((row) => [row.categoryId, row.totalMinor]));

    return budgets
      .map((budget) => {
        const spentMinor = spentByCategory.get(budget.categoryId) ?? 0;
        return {
          categoryId: budget.categoryId,
          name: names.get(budget.categoryId) ?? UNCATEGORISED,
          limitMinor: budget.limitMinor,
          spentMinor,
          usedPercent:
            budget.limitMinor > 0 ? Math.round((spentMinor / budget.limitMinor) * 100) : 0,
        };
      })
      .sort((a, b) => b.usedPercent - a.usedPercent);
  }

  private buildInsights(input: {
    currency: string;
    window: MonthWindow;
    remainingMinor: number;
    suggestedDailyLimitMinor: number;
    topCategories: Array<{ name: string; spentMinor: number; sharePercent: number }>;
    budgets: BalanceBudgetStatus[];
    weekDeltas: Array<{ name: string; deltaPercent: number }>;
  }): BalanceInsight[] {
    const insights: BalanceInsight[] = [];
    const { currency, window } = input;

    if (input.remainingMinor < 0) {
      insights.push({
        id: 'over-plan',
        tone: 'warning',
        message: `You're ${formatMinor(currency, Math.abs(input.remainingMinor))} over this month's plan. Small daily adjustments can bring it back — no need to panic.`,
      });
    }

    for (const budget of input.budgets) {
      if (insights.length >= 4) break;
      if (budget.usedPercent >= 100) {
        insights.push({
          id: `budget-over-${budget.categoryId}`,
          tone: 'warning',
          message: `${budget.name} has passed its budget by ${formatMinor(currency, budget.spentMinor - budget.limitMinor)}.`,
        });
      } else if (budget.usedPercent >= 80 && window.daysRemaining > 0) {
        insights.push({
          id: `budget-near-${budget.categoryId}`,
          tone: 'warning',
          message: `You've used ${budget.usedPercent}% of your ${budget.name} budget with ${window.daysRemaining} days remaining.`,
        });
      }
    }

    for (const delta of input.weekDeltas) {
      if (insights.length >= 4) break;
      if (delta.deltaPercent >= 25) {
        insights.push({
          id: `week-up-${delta.name}`,
          tone: 'neutral',
          message: `You spent ${delta.deltaPercent}% more on ${delta.name} this week than last week.`,
        });
      } else if (delta.deltaPercent <= -25) {
        insights.push({
          id: `week-down-${delta.name}`,
          tone: 'positive',
          message: `Nice — ${delta.name} spending is down ${Math.abs(delta.deltaPercent)}% compared with last week.`,
        });
      }
    }

    const [topCategory] = input.topCategories;
    if (insights.length < 4 && topCategory && topCategory.sharePercent >= 35) {
      insights.push({
        id: 'top-category',
        tone: 'neutral',
        message: `${topCategory.name} is your largest expense this month (${topCategory.sharePercent}% of spending).`,
      });
    }

    if (insights.length === 0 && window.isCurrentMonth && input.remainingMinor >= 0) {
      insights.push({
        id: 'on-track',
        tone: 'positive',
        message: `You're on track. Keeping daily spending near ${formatMinor(currency, input.suggestedDailyLimitMinor)} will meet this month's plan.`,
      });
    }

    return insights.slice(0, 4);
  }

  private async weekDeltas(
    userId: string,
    window: MonthWindow,
    names: Map<string, string>,
  ): Promise<Array<{ name: string; deltaPercent: number }>> {
    if (!window.isCurrentMonth) return [];

    const today = new Date(`${window.today}T00:00:00Z`);
    const shift = (days: number): string =>
      new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);

    const [currentWeek, previousWeek] = await Promise.all([
      this.repository.spentByCategory(userId, shift(6), window.today),
      this.repository.spentByCategory(userId, shift(13), shift(7)),
    ]);

    const previousTotals = new Map(previousWeek.map((row) => [row.categoryId, row.totalMinor]));
    const deltas: Array<{ name: string; deltaPercent: number }> = [];

    for (const row of currentWeek) {
      const previous = previousTotals.get(row.categoryId) ?? 0;
      if (previous <= 0 || row.categoryId === null) continue;
      const deltaPercent = Math.round(((row.totalMinor - previous) / previous) * 100);
      deltas.push({ name: names.get(row.categoryId) ?? UNCATEGORISED, deltaPercent });
    }

    return deltas.sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent)).slice(0, 2);
  }

  async getOverview(
    userId: string,
    options: { month?: string; today?: string },
  ): Promise<BalanceOverviewResponse> {
    const window = resolveMonthWindow(
      this.parseMonth(options.month),
      this.parseToday(options.today),
    );
    const profile = await this.profileOrDefault(userId);
    const currency = profile.currencyCode;

    const [extraIncomeMinor, spentMinor, todayTotals, categories, categoryTotals, bills] =
      await Promise.all([
        this.repository.sumByKind(userId, 'income', window.from, window.to),
        this.repository.sumByKind(userId, 'expense', window.from, window.to),
        window.isCurrentMonth
          ? this.repository.spentByCategory(userId, window.today, window.today)
          : Promise.resolve([]),
        this.repository.listCategories(userId),
        this.repository.spentByCategory(userId, window.from, window.to),
        this.repository.listBills(userId),
      ]);

    const fixedCategoryIds = new Set(
      categories.filter((category) => category.isFixed).map((category) => category.id),
    );
    const sumFixed = (rows: Array<{ categoryId: string | null; totalMinor: number }>): number =>
      rows.reduce(
        (total, row) =>
          row.categoryId && fixedCategoryIds.has(row.categoryId) ? total + row.totalMinor : total,
        0,
      );
    const sumAll = (rows: Array<{ categoryId: string | null; totalMinor: number }>): number =>
      rows.reduce((total, row) => total + row.totalMinor, 0);

    const fixedSpentMinor = sumFixed(categoryTotals);
    const spentTodayMinor = sumAll(todayTotals);
    const variableSpentTodayMinor = spentTodayMinor - sumFixed(todayTotals);

    const numbers = computeOverviewNumbers({
      monthlyIncomeMinor: profile.monthlyIncomeMinor,
      extraIncomeMinor,
      spentMinor,
      fixedEstimateMinor: profile.fixedExpensesMinor,
      fixedSpentMinor,
      variableSpentTodayMinor,
      savingsTargetMinor: profile.savingsTargetMinor,
      window,
    });

    const names = new Map(categories.map((category) => [category.id, category.name]));
    const topCategories = categoryTotals
      .slice()
      .sort((a, b) => b.totalMinor - a.totalMinor)
      .slice(0, 5)
      .map((row) => ({
        categoryId: row.categoryId,
        name: row.categoryId ? (names.get(row.categoryId) ?? UNCATEGORISED) : UNCATEGORISED,
        spentMinor: row.totalMinor,
        sharePercent: spentMinor > 0 ? Math.round((row.totalMinor / spentMinor) * 100) : 0,
      }));

    const budgets = await this.budgetStatuses(userId, window, categories);
    const weekDeltas = await this.weekDeltas(userId, window, names);

    const upcomingBills: UpcomingBill[] = bills
      .map((bill) => ({
        id: bill.id,
        name: bill.name,
        amountMinor: bill.amountMinor,
        dueDay: bill.dueDay,
        dueInDays: dueInDays(bill.dueDay, window.today),
      }))
      .sort((a, b) => a.dueInDays - b.dueInDays)
      .slice(0, 5);

    const insights = this.buildInsights({
      currency,
      window,
      remainingMinor: numbers.remainingMinor,
      suggestedDailyLimitMinor: numbers.suggestedDailyLimitMinor,
      topCategories,
      budgets,
      weekDeltas,
    });

    const calculation = [
      `Income = monthly income ${formatMinor(currency, profile.monthlyIncomeMinor)} + extra income recorded ${formatMinor(currency, extraIncomeMinor)} = ${formatMinor(currency, numbers.incomeMinor)}`,
      `Fixed costs reserved = the larger of your estimate ${formatMinor(currency, profile.fixedExpensesMinor)} and fixed-category spending ${formatMinor(currency, fixedSpentMinor)} = ${formatMinor(currency, numbers.fixedReservedMinor)}`,
      `Everyday spending = all expenses ${formatMinor(currency, spentMinor)} − fixed-category spending ${formatMinor(currency, fixedSpentMinor)} = ${formatMinor(currency, numbers.variableSpentMinor)}`,
      `Remaining = income − savings target ${formatMinor(currency, profile.savingsTargetMinor)} − fixed costs reserved − everyday spending = ${formatMinor(currency, numbers.remainingMinor)}`,
      window.daysRemaining > 0
        ? `Daily limit = remaining before today ÷ ${window.daysRemaining} days left = ${formatMinor(currency, numbers.suggestedDailyLimitMinor)}`
        : 'Daily limit = 0 (this month has ended)',
      `Safe to spend today = daily limit − everyday spending today ${formatMinor(currency, variableSpentTodayMinor)} = ${formatMinor(currency, numbers.safeToSpendTodayMinor)}`,
    ];

    return {
      month: window.month,
      currency,
      isConfigured: profile.configuredAt !== null,
      totals: {
        incomeMinor: numbers.incomeMinor,
        extraIncomeMinor,
        spentMinor,
        fixedReservedMinor: numbers.fixedReservedMinor,
        variableSpentMinor: numbers.variableSpentMinor,
        savingsTargetMinor: profile.savingsTargetMinor,
        remainingMinor: numbers.remainingMinor,
      },
      daily: {
        daysInMonth: window.daysInMonth,
        daysElapsed: window.daysElapsed,
        daysRemaining: window.daysRemaining,
        suggestedDailyLimitMinor: numbers.suggestedDailyLimitMinor,
        spentTodayMinor,
        safeToSpendTodayMinor: numbers.safeToSpendTodayMinor,
        averageDailySpendMinor: numbers.averageDailySpendMinor,
        projectedMonthEndBalanceMinor: numbers.projectedMonthEndBalanceMinor,
      },
      topCategories,
      budgets,
      upcomingBills,
      insights,
      calculation,
    };
  }

  async getBudgets(
    userId: string,
    options: { month?: string; today?: string },
  ): Promise<BalanceBudgetsResponse> {
    const window = resolveMonthWindow(
      this.parseMonth(options.month),
      this.parseToday(options.today),
    );
    const [profile, categories] = await Promise.all([
      this.profileOrDefault(userId),
      this.repository.listCategories(userId),
    ]);
    const budgets = await this.budgetStatuses(userId, window, categories);
    return { month: window.month, currency: profile.currencyCode, budgets };
  }

  async setBudget(
    userId: string,
    input: { categoryId: string; month?: string; limitMinor: number },
  ): Promise<BalanceBudgetsResponse> {
    const exists = await this.repository.categoryExists(userId, input.categoryId);
    if (!exists) {
      throw new BadRequestException('Unknown category');
    }
    const window = resolveMonthWindow(this.parseMonth(input.month));
    await this.repository.upsertBudget(userId, input.categoryId, window.month, input.limitMinor);
    return this.getBudgets(userId, { month: window.month });
  }

  private toGoalContract(row: GoalRow): SavingsGoal {
    return {
      id: row.id,
      name: row.name,
      targetMinor: row.targetMinor,
      savedMinor: row.savedMinor,
      monthlyContributionMinor: row.monthlyContributionMinor,
      isAchieved: row.achievedAt !== null || row.savedMinor >= row.targetMinor,
      estimatedMonthsRemaining: estimatedMonthsRemaining(row),
    };
  }

  async listGoals(userId: string): Promise<SavingsGoalsResponse> {
    const [profile, goals] = await Promise.all([
      this.profileOrDefault(userId),
      this.repository.listGoals(userId),
    ]);
    return {
      currency: profile.currencyCode,
      goals: goals.map((goal) => this.toGoalContract(goal)),
    };
  }

  async createGoal(userId: string, input: CreateSavingsGoalInput): Promise<SavingsGoalResponse> {
    const goal = await this.repository.createGoal(userId, {
      name: input.name,
      targetMinor: input.targetMinor,
      savedMinor: input.savedMinor ?? 0,
      monthlyContributionMinor: input.monthlyContributionMinor ?? 0,
    });
    return { goal: this.toGoalContract(goal) };
  }

  async contributeToGoal(
    userId: string,
    goalId: string,
    input: ContributeSavingsGoalInput,
  ): Promise<SavingsGoalResponse> {
    const goal = await this.repository.contributeToGoal(userId, goalId, input.amountMinor);
    if (!goal) {
      throw new NotFoundException('Savings goal not found');
    }
    return { goal: this.toGoalContract(goal) };
  }

  async deleteGoal(userId: string, goalId: string): Promise<BalanceDeletedResponse> {
    const deleted = await this.repository.softDeleteGoal(userId, goalId);
    if (!deleted) {
      throw new NotFoundException('Savings goal not found');
    }
    return { deleted: true };
  }

  async listBills(userId: string, options: { today?: string }): Promise<RecurringBillsResponse> {
    const today = this.parseToday(options.today) ?? resolveMonthWindow().today;
    const bills = await this.repository.listBills(userId);
    return {
      bills: bills
        .map((bill) => ({
          id: bill.id,
          name: bill.name,
          amountMinor: bill.amountMinor,
          dueDay: bill.dueDay,
          dueInDays: dueInDays(bill.dueDay, today),
        }))
        .sort((a, b) => a.dueInDays - b.dueInDays),
    };
  }

  async createBill(
    userId: string,
    input: CreateRecurringBillInput,
  ): Promise<RecurringBillResponse> {
    const bill = await this.repository.createBill(userId, input);
    const today = resolveMonthWindow().today;
    return {
      bill: {
        id: bill.id,
        name: bill.name,
        amountMinor: bill.amountMinor,
        dueDay: bill.dueDay,
        dueInDays: dueInDays(bill.dueDay, today),
      },
    };
  }

  async deleteBill(userId: string, billId: string): Promise<BalanceDeletedResponse> {
    const deleted = await this.repository.softDeleteBill(userId, billId);
    if (!deleted) {
      throw new NotFoundException('Bill not found');
    }
    return { deleted: true };
  }

  async getReport(
    userId: string,
    options: { month?: string; today?: string },
  ): Promise<BalanceReportResponse> {
    const window = resolveMonthWindow(
      this.parseMonth(options.month),
      this.parseToday(options.today),
    );
    const profile = await this.profileOrDefault(userId);
    const currency = profile.currencyCode;

    const previousMonth = previousMonthOf(window.month);
    const previousWindow = resolveMonthWindow(previousMonth, window.today);

    const [
      extraIncomeMinor,
      spentMinor,
      categoryTotals,
      dayTotals,
      previousSpentMinor,
      categories,
    ] = await Promise.all([
      this.repository.sumByKind(userId, 'income', window.from, window.to),
      this.repository.sumByKind(userId, 'expense', window.from, window.to),
      this.repository.spentByCategory(userId, window.from, window.to),
      this.repository.spentByDay(userId, window.from, window.to),
      this.repository.sumByKind(userId, 'expense', previousWindow.from, previousWindow.to),
      this.repository.listCategories(userId),
    ]);

    const incomeMinor = profile.monthlyIncomeMinor + extraIncomeMinor;
    const savedMinor = incomeMinor - spentMinor;
    const savingsRatePercent = incomeMinor > 0 ? Math.round((savedMinor / incomeMinor) * 100) : 0;
    const averageDailySpendMinor =
      window.daysElapsed > 0 ? Math.round(spentMinor / window.daysElapsed) : 0;

    const names = new Map(categories.map((category) => [category.id, category.name]));
    const byCategory = categoryTotals
      .slice()
      .sort((a, b) => b.totalMinor - a.totalMinor)
      .map((row) => ({
        categoryId: row.categoryId,
        name: row.categoryId ? (names.get(row.categoryId) ?? UNCATEGORISED) : UNCATEGORISED,
        spentMinor: row.totalMinor,
        sharePercent: spentMinor > 0 ? Math.round((row.totalMinor / spentMinor) * 100) : 0,
      }));

    const highestDay = dayTotals.reduce<{ date: string; spentMinor: number } | null>(
      (highest, row) =>
        highest === null || row.totalMinor > highest.spentMinor
          ? { date: row.date, spentMinor: row.totalMinor }
          : highest,
      null,
    );

    const calculation = [
      `Income = monthly income ${formatMinor(currency, profile.monthlyIncomeMinor)} + extra income ${formatMinor(currency, extraIncomeMinor)} = ${formatMinor(currency, incomeMinor)}`,
      `Spent = all expenses recorded in ${window.month} = ${formatMinor(currency, spentMinor)}`,
      `Saved = income − spent = ${formatMinor(currency, savedMinor)}`,
      incomeMinor > 0
        ? `Savings rate = saved ÷ income = ${savingsRatePercent}%`
        : 'Savings rate = 0% (no income recorded)',
    ];

    return {
      month: window.month,
      currency,
      incomeMinor,
      spentMinor,
      savedMinor,
      savingsRatePercent,
      averageDailySpendMinor,
      highestSpendingDay: highestDay,
      byCategory,
      byDay: dayTotals.map((row) => ({ date: row.date, spentMinor: row.totalMinor })),
      previousMonth:
        previousSpentMinor > 0
          ? {
              month: previousMonth,
              spentMinor: previousSpentMinor,
              deltaMinor: spentMinor - previousSpentMinor,
            }
          : null,
      calculation,
    };
  }
}
