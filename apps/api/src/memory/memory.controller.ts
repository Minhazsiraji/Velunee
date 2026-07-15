import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  createMemorySchema,
  updateMemorySchema,
  type CreateMemoryInput,
  type MemoriesClearedResponse,
  type MemoriesResponse,
  type MemoryDeletedResponse,
  type MemoryResponse,
  type UpdateMemoryInput,
} from '@velunee/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { MemoryService } from './memory.service';

@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser): Promise<MemoriesResponse> {
    return this.memoryService.list(user.id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createMemorySchema))
    input: CreateMemoryInput,
  ): Promise<MemoryResponse> {
    return this.memoryService.create(user.id, input);
  }

  @Patch(':memoryId')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memoryId') memoryId: string,
    @Body(new ZodValidationPipe(updateMemorySchema))
    input: UpdateMemoryInput,
  ): Promise<MemoryResponse> {
    return this.memoryService.update(user.id, memoryId, input);
  }

  @Delete(':memoryId')
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('memoryId') memoryId: string,
  ): Promise<MemoryDeletedResponse> {
    return this.memoryService.delete(user.id, memoryId);
  }

  @Delete()
  async clearAll(@CurrentUser() user: AuthenticatedUser): Promise<MemoriesClearedResponse> {
    return this.memoryService.clearAll(user.id);
  }
}
