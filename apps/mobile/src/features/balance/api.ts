import {
  affordabilityResponseSchema,
  balanceBudgetsResponseSchema,
  balanceCategoriesResponseSchema,
  balanceCategoryResponseSchema,
  balanceDeletedResponseSchema,
  balanceOverviewResponseSchema,
  balanceProfileResponseSchema,
  balanceReportResponseSchema,
  balanceTransactionResponseSchema,
  balanceTransactionsResponseSchema,
  parseSpendingResponseSchema,
  recurringBillResponseSchema,
  recurringBillsResponseSchema,
  savingsGoalResponseSchema,
  savingsGoalsResponseSchema,
  type AffordabilityResponse,
  type BalanceBudgetsResponse,
  type BalanceCategoriesResponse,
  type BalanceCategoryResponse,
  type BalanceDeletedResponse,
  type BalanceOverviewResponse,
  type BalanceProfileResponse,
  type BalanceReportResponse,
  type BalanceTransactionResponse,
  type BalanceTransactionsResponse,
  type CreateBalanceCategoryInput,
  type CreateBalanceTransactionInput,
  type CreateRecurringBillInput,
  type CreateSavingsGoalInput,
  type ParseSpendingResponse,
  type RecurringBillResponse,
  type RecurringBillsResponse,
  type SavingsGoalResponse,
  type SavingsGoalsResponse,
  type SetBalanceBudgetInput,
  type UpdateBalanceProfileInput,
  type UpdateBalanceTransactionInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';
import { todayIso } from './format';

export async function loadOverview(month?: string): Promise<BalanceOverviewResponse> {
  const params = new URLSearchParams({ today: todayIso() });
  if (month) params.set('month', month);
  const payload = await apiRequest<unknown>(`/balance/overview?${params.toString()}`);
  return balanceOverviewResponseSchema.parse(payload);
}

export async function loadProfile(): Promise<BalanceProfileResponse> {
  const payload = await apiRequest<unknown>('/balance/profile');
  return balanceProfileResponseSchema.parse(payload);
}

export async function updateProfile(
  input: UpdateBalanceProfileInput,
): Promise<BalanceProfileResponse> {
  const payload = await apiRequest<unknown>('/balance/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return balanceProfileResponseSchema.parse(payload);
}

export async function loadCategories(): Promise<BalanceCategoriesResponse> {
  const payload = await apiRequest<unknown>('/balance/categories');
  return balanceCategoriesResponseSchema.parse(payload);
}

export async function createCategory(
  input: CreateBalanceCategoryInput,
): Promise<BalanceCategoryResponse> {
  const payload = await apiRequest<unknown>('/balance/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return balanceCategoryResponseSchema.parse(payload);
}

export async function loadTransactions(options: {
  month?: string;
  cursor?: string;
}): Promise<BalanceTransactionsResponse> {
  const params = new URLSearchParams({ today: todayIso() });
  if (options.month) params.set('month', options.month);
  if (options.cursor) params.set('cursor', options.cursor);
  const payload = await apiRequest<unknown>(`/balance/transactions?${params.toString()}`);
  return balanceTransactionsResponseSchema.parse(payload);
}

export async function createTransaction(
  input: CreateBalanceTransactionInput,
): Promise<BalanceTransactionResponse> {
  const payload = await apiRequest<unknown>('/balance/transactions', {
    method: 'POST',
    body: JSON.stringify({ occurredOn: todayIso(), ...input }),
  });
  return balanceTransactionResponseSchema.parse(payload);
}

export async function updateTransaction(
  transactionId: string,
  input: UpdateBalanceTransactionInput,
): Promise<BalanceTransactionResponse> {
  const payload = await apiRequest<unknown>(`/balance/transactions/${transactionId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return balanceTransactionResponseSchema.parse(payload);
}

export async function deleteTransaction(transactionId: string): Promise<BalanceDeletedResponse> {
  const payload = await apiRequest<unknown>(`/balance/transactions/${transactionId}`, {
    method: 'DELETE',
  });
  return balanceDeletedResponseSchema.parse(payload);
}

export async function parseSpending(text: string): Promise<ParseSpendingResponse> {
  const payload = await apiRequest<unknown>('/balance/transactions/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return parseSpendingResponseSchema.parse(payload);
}

export async function checkAffordability(amountMinor: number): Promise<AffordabilityResponse> {
  const payload = await apiRequest<unknown>(`/balance/affordability?today=${todayIso()}`, {
    method: 'POST',
    body: JSON.stringify({ amountMinor }),
  });
  return affordabilityResponseSchema.parse(payload);
}

export async function loadBudgets(month?: string): Promise<BalanceBudgetsResponse> {
  const params = new URLSearchParams({ today: todayIso() });
  if (month) params.set('month', month);
  const payload = await apiRequest<unknown>(`/balance/budgets?${params.toString()}`);
  return balanceBudgetsResponseSchema.parse(payload);
}

export async function setBudget(input: SetBalanceBudgetInput): Promise<BalanceBudgetsResponse> {
  const payload = await apiRequest<unknown>('/balance/budgets', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return balanceBudgetsResponseSchema.parse(payload);
}

export async function loadGoals(): Promise<SavingsGoalsResponse> {
  const payload = await apiRequest<unknown>('/balance/goals');
  return savingsGoalsResponseSchema.parse(payload);
}

export async function createGoal(input: CreateSavingsGoalInput): Promise<SavingsGoalResponse> {
  const payload = await apiRequest<unknown>('/balance/goals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return savingsGoalResponseSchema.parse(payload);
}

export async function contributeToGoal(
  goalId: string,
  amountMinor: number,
): Promise<SavingsGoalResponse> {
  const payload = await apiRequest<unknown>(`/balance/goals/${goalId}/contributions`, {
    method: 'POST',
    body: JSON.stringify({ amountMinor }),
  });
  return savingsGoalResponseSchema.parse(payload);
}

export async function deleteGoal(goalId: string): Promise<BalanceDeletedResponse> {
  const payload = await apiRequest<unknown>(`/balance/goals/${goalId}`, { method: 'DELETE' });
  return balanceDeletedResponseSchema.parse(payload);
}

export async function loadBills(): Promise<RecurringBillsResponse> {
  const payload = await apiRequest<unknown>(`/balance/bills?today=${todayIso()}`);
  return recurringBillsResponseSchema.parse(payload);
}

export async function createBill(input: CreateRecurringBillInput): Promise<RecurringBillResponse> {
  const payload = await apiRequest<unknown>('/balance/bills', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return recurringBillResponseSchema.parse(payload);
}

export async function deleteBill(billId: string): Promise<BalanceDeletedResponse> {
  const payload = await apiRequest<unknown>(`/balance/bills/${billId}`, { method: 'DELETE' });
  return balanceDeletedResponseSchema.parse(payload);
}

export async function loadReport(month?: string): Promise<BalanceReportResponse> {
  const params = new URLSearchParams({ today: todayIso() });
  if (month) params.set('month', month);
  const payload = await apiRequest<unknown>(`/balance/report?${params.toString()}`);
  return balanceReportResponseSchema.parse(payload);
}
