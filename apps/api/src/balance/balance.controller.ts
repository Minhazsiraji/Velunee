import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  affordabilityRequestSchema,
  contributeSavingsGoalSchema,
  createBalanceCategorySchema,
  createBalanceTransactionSchema,
  createRecurringBillSchema,
  createSavingsGoalSchema,
  parseSpendingSchema,
  setBalanceBudgetSchema,
  updateBalanceProfileSchema,
  type AffordabilityRequestInput,
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
  type ContributeSavingsGoalInput,
  type CreateBalanceCategoryInput,
  type CreateBalanceTransactionInput,
  type CreateRecurringBillInput,
  type CreateSavingsGoalInput,
  type ParseSpendingInput,
  type ParseSpendingResponse,
  type RecurringBillResponse,
  type RecurringBillsResponse,
  type SavingsGoalResponse,
  type SavingsGoalsResponse,
  type SetBalanceBudgetInput,
  type UpdateBalanceProfileInput,
} from '@velunee/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BalanceService } from './balance.service';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('overview')
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
    @Query('today') today?: string,
  ): Promise<BalanceOverviewResponse> {
    return this.balanceService.getOverview(user.id, { month, today });
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<BalanceProfileResponse> {
    return this.balanceService.getProfile(user.id);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateBalanceProfileSchema))
    input: UpdateBalanceProfileInput,
  ): Promise<BalanceProfileResponse> {
    return this.balanceService.updateProfile(user.id, input);
  }

  @Get('categories')
  async listCategories(@CurrentUser() user: AuthenticatedUser): Promise<BalanceCategoriesResponse> {
    return this.balanceService.listCategories(user.id);
  }

  @Post('categories')
  async createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createBalanceCategorySchema))
    input: CreateBalanceCategoryInput,
  ): Promise<BalanceCategoryResponse> {
    return this.balanceService.createCategory(user.id, input);
  }

  @Get('transactions')
  async listTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
    @Query('today') today?: string,
    @Query('cursor') cursor?: string,
  ): Promise<BalanceTransactionsResponse> {
    return this.balanceService.listTransactions(user.id, { month, today, cursor });
  }

  @Post('transactions')
  async createTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createBalanceTransactionSchema))
    input: CreateBalanceTransactionInput,
  ): Promise<BalanceTransactionResponse> {
    return this.balanceService.createTransaction(user.id, input);
  }

  @Delete('transactions/:transactionId')
  async deleteTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionId') transactionId: string,
  ): Promise<BalanceDeletedResponse> {
    return this.balanceService.deleteTransaction(user.id, transactionId);
  }

  @Post('transactions/parse')
  async parseSpending(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(parseSpendingSchema))
    input: ParseSpendingInput,
  ): Promise<ParseSpendingResponse> {
    return this.balanceService.parseSpending(user.id, input);
  }

  @Post('affordability')
  async checkAffordability(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(affordabilityRequestSchema))
    input: AffordabilityRequestInput,
    @Query('today') today?: string,
  ): Promise<AffordabilityResponse> {
    return this.balanceService.checkAffordability(user.id, input, { today });
  }

  @Get('budgets')
  async getBudgets(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
    @Query('today') today?: string,
  ): Promise<BalanceBudgetsResponse> {
    return this.balanceService.getBudgets(user.id, { month, today });
  }

  @Put('budgets')
  async setBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(setBalanceBudgetSchema))
    input: SetBalanceBudgetInput,
  ): Promise<BalanceBudgetsResponse> {
    return this.balanceService.setBudget(user.id, input);
  }

  @Get('goals')
  async listGoals(@CurrentUser() user: AuthenticatedUser): Promise<SavingsGoalsResponse> {
    return this.balanceService.listGoals(user.id);
  }

  @Post('goals')
  async createGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createSavingsGoalSchema))
    input: CreateSavingsGoalInput,
  ): Promise<SavingsGoalResponse> {
    return this.balanceService.createGoal(user.id, input);
  }

  @Post('goals/:goalId/contributions')
  async contributeToGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
    @Body(new ZodValidationPipe(contributeSavingsGoalSchema))
    input: ContributeSavingsGoalInput,
  ): Promise<SavingsGoalResponse> {
    return this.balanceService.contributeToGoal(user.id, goalId, input);
  }

  @Delete('goals/:goalId')
  async deleteGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('goalId') goalId: string,
  ): Promise<BalanceDeletedResponse> {
    return this.balanceService.deleteGoal(user.id, goalId);
  }

  @Get('bills')
  async listBills(
    @CurrentUser() user: AuthenticatedUser,
    @Query('today') today?: string,
  ): Promise<RecurringBillsResponse> {
    return this.balanceService.listBills(user.id, { today });
  }

  @Post('bills')
  async createBill(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createRecurringBillSchema))
    input: CreateRecurringBillInput,
  ): Promise<RecurringBillResponse> {
    return this.balanceService.createBill(user.id, input);
  }

  @Delete('bills/:billId')
  async deleteBill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('billId') billId: string,
  ): Promise<BalanceDeletedResponse> {
    return this.balanceService.deleteBill(user.id, billId);
  }

  @Get('report')
  async getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
    @Query('today') today?: string,
  ): Promise<BalanceReportResponse> {
    return this.balanceService.getReport(user.id, { month, today });
  }
}
