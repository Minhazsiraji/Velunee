import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  createStudyTopicSchema,
  learnAskRequestSchema,
  updateLearnerProfileSchema,
  updateStudyTopicStatusSchema,
  type CreateStudyTopicInput,
  type LearnAskRequestInput,
  type LearnAskResponse,
  type LearnDeletedResponse,
  type LearnerProfileResponse,
  type StudyTopicResponse,
  type StudyTopicsResponse,
  type UpdateLearnerProfileInput,
  type UpdateStudyTopicStatusInput,
} from '@velunee/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LearnService } from './learn.service';

@Controller('learn')
export class LearnController {
  constructor(private readonly learnService: LearnService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<LearnerProfileResponse> {
    return this.learnService.getProfile(user.id);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateLearnerProfileSchema))
    input: UpdateLearnerProfileInput,
  ): Promise<LearnerProfileResponse> {
    return this.learnService.updateProfile(user.id, input);
  }

  @Post('ask')
  async ask(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(learnAskRequestSchema))
    input: LearnAskRequestInput,
  ): Promise<LearnAskResponse> {
    return this.learnService.ask(user.id, input);
  }

  @Get('topics')
  async listTopics(@CurrentUser() user: AuthenticatedUser): Promise<StudyTopicsResponse> {
    return this.learnService.listTopics(user.id);
  }

  @Post('topics')
  async createTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudyTopicSchema))
    input: CreateStudyTopicInput,
  ): Promise<StudyTopicResponse> {
    return this.learnService.createTopic(user.id, input);
  }

  @Patch('topics/:topicId')
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('topicId') topicId: string,
    @Body(new ZodValidationPipe(updateStudyTopicStatusSchema))
    input: UpdateStudyTopicStatusInput,
  ): Promise<StudyTopicResponse> {
    return this.learnService.updateTopicStatus(user.id, topicId, input);
  }

  @Delete('topics/:topicId')
  async deleteTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Param('topicId') topicId: string,
  ): Promise<LearnDeletedResponse> {
    return this.learnService.deleteTopic(user.id, topicId);
  }
}
