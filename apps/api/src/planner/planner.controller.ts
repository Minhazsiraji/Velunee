import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type PlannerDayResponse,
  type PlannerDeletedResponse,
  type PlannerTaskResponse,
  type UpdateTaskInput,
} from '@velunee/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PlannerService } from './planner.service';

@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Get('day')
  async getDay(
    @CurrentUser() user: AuthenticatedUser,
    @Query('day') day?: string,
  ): Promise<PlannerDayResponse> {
    return this.plannerService.getDay(user.id, day);
  }

  @Post('tasks')
  async createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTaskSchema))
    input: CreateTaskInput,
  ): Promise<PlannerTaskResponse> {
    return this.plannerService.createTask(user.id, input);
  }

  @Patch('tasks/:taskId')
  async updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
    @Body(new ZodValidationPipe(updateTaskSchema))
    input: UpdateTaskInput,
  ): Promise<PlannerTaskResponse> {
    return this.plannerService.updateTask(user.id, taskId, input);
  }

  @Delete('tasks/:taskId')
  async deleteTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('taskId') taskId: string,
  ): Promise<PlannerDeletedResponse> {
    return this.plannerService.deleteTask(user.id, taskId);
  }
}
