import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateBalanceTransactionInput,
  CreateRecurringBillInput,
  CreateSavingsGoalInput,
  SetBalanceBudgetInput,
  UpdateBalanceProfileInput,
  UpdateBalanceTransactionInput,
  CreateFixedCostInput,
  UpdateFixedCostInput,
} from '@velunee/contracts';

import {
  checkAffordability,
  contributeToGoal,
  createBill,
  createFixedCost,
  createGoal,
  createTransaction,
  deleteBill,
  deleteFixedCost,
  deleteGoal,
  deleteTransaction,
  loadBudgets,
  loadCategories,
  loadFixedCosts,
  loadGoals,
  loadOverview,
  loadProfile,
  loadReport,
  loadTransactions,
  parseSpending,
  setBudget,
  updateFixedCost,
  updateProfile,
  updateTransaction,
} from './api';

const balanceKey = ['balance'] as const;

function useInvalidateBalance(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: balanceKey });
  };
}

export function useBalanceOverview(month?: string) {
  return useQuery({
    queryKey: [...balanceKey, 'overview', month ?? 'current'],
    queryFn: () => loadOverview(month),
  });
}

export function useBalanceCategories() {
  return useQuery({
    queryKey: [...balanceKey, 'categories'],
    queryFn: () => loadCategories(),
    staleTime: 5 * 60_000,
  });
}

export function useBalanceProfile(enabled: boolean) {
  return useQuery({
    queryKey: [...balanceKey, 'profile'],
    queryFn: () => loadProfile(),
    enabled,
  });
}

export function useUpdateBalanceProfile() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (input: UpdateBalanceProfileInput) => updateProfile(input),
    onSuccess: invalidate,
  });
}

export function useFixedCosts() {
  return useQuery({
    queryKey: [...balanceKey, 'fixed-costs'],
    queryFn: () => loadFixedCosts(),
  });
}

export function useCreateFixedCost() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (input: CreateFixedCostInput) => createFixedCost(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFixedCost() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (vars: { fixedCostId: string; input: UpdateFixedCostInput }) =>
      updateFixedCost(vars.fixedCostId, vars.input),
    onSuccess: invalidate,
  });
}

export function useDeleteFixedCost() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (fixedCostId: string) => deleteFixedCost(fixedCostId),
    onSuccess: invalidate,
  });
}

export function useBalanceTransactions(month?: string) {
  return useInfiniteQuery({
    queryKey: [...balanceKey, 'transactions', month ?? 'current'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      loadTransactions({ month, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useCreateTransaction() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (input: CreateBalanceTransactionInput) => createTransaction(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (vars: { transactionId: string; input: UpdateBalanceTransactionInput }) =>
      updateTransaction(vars.transactionId, vars.input),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (transactionId: string) => deleteTransaction(transactionId),
    onSuccess: invalidate,
  });
}

export function useParseSpending() {
  return useMutation({
    mutationFn: (text: string) => parseSpending(text),
  });
}

export function useCheckAffordability() {
  return useMutation({
    mutationFn: (amountMinor: number) => checkAffordability(amountMinor),
  });
}

export function useBalanceBudgets(month?: string) {
  return useQuery({
    queryKey: [...balanceKey, 'budgets', month ?? 'current'],
    queryFn: () => loadBudgets(month),
  });
}

export function useSetBudget() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (input: SetBalanceBudgetInput) => setBudget(input),
    onSuccess: invalidate,
  });
}

export function useSavingsGoals() {
  return useQuery({
    queryKey: [...balanceKey, 'goals'],
    queryFn: () => loadGoals(),
  });
}

export function useCreateGoal() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (input: CreateSavingsGoalInput) => createGoal(input),
    onSuccess: invalidate,
  });
}

export function useContributeToGoal() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (input: { goalId: string; amountMinor: number }) =>
      contributeToGoal(input.goalId, input.amountMinor),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: invalidate,
  });
}

export function useCreateBill() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (input: CreateRecurringBillInput) => createBill(input),
    onSuccess: invalidate,
  });
}

export function useDeleteBill() {
  const invalidate = useInvalidateBalance();
  return useMutation({
    mutationFn: (billId: string) => deleteBill(billId),
    onSuccess: invalidate,
  });
}

export function useBalanceReport(month?: string) {
  return useQuery({
    queryKey: [...balanceKey, 'report', month ?? 'current'],
    queryFn: () => loadReport(month),
  });
}
