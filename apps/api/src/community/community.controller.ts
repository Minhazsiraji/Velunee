import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  createPostSchema,
  reactionKindSchema,
  type CommunityFeedResponse,
  type CreatePostInput,
  type CreatePostResponse,
  type ModerationActionResponse,
  type ModerationQueueResponse,
  type ReactionKind,
  type ReactionState,
} from '@velunee/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('feed')
  async getFeed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('cursor') cursor?: string,
  ): Promise<CommunityFeedResponse> {
    return this.communityService.getFeed(user.id, cursor);
  }

  @Post('posts')
  async createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPostSchema))
    input: CreatePostInput,
  ): Promise<CreatePostResponse> {
    return this.communityService.createPost(user.id, input.caption);
  }

  @Get('moderation/queue')
  async getModerationQueue(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ModerationQueueResponse> {
    return this.communityService.getModerationQueue(user.id);
  }

  @Post('moderation/:postId/approve')
  async approvePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
  ): Promise<ModerationActionResponse> {
    return this.communityService.moderatePost(user.id, postId, 'approve');
  }

  @Post('moderation/:postId/reject')
  async rejectPost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
  ): Promise<ModerationActionResponse> {
    return this.communityService.moderatePost(user.id, postId, 'reject');
  }

  @Post('posts/:postId/reactions')
  async react(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
    @Query('type') type?: string,
  ): Promise<ReactionState> {
    const kind: ReactionKind = reactionKindSchema.catch('heart').parse(type);
    return this.communityService.react(user.id, postId, kind);
  }

  @Delete('posts/:postId/reactions')
  async removeReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
    @Query('type') type?: string,
  ): Promise<ReactionState> {
    const kind: ReactionKind = reactionKindSchema.catch('heart').parse(type);
    return this.communityService.removeReaction(user.id, postId, kind);
  }
}
