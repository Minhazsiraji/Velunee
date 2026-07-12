import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  createPostSchema,
  reactionKindSchema,
  type CommunityFeedResponse,
  type CommunityPost,
  type CreatePostInput,
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
  ): Promise<CommunityPost> {
    return this.communityService.createPost(user.id, input.caption);
  }

  @Post('posts/:postId/reactions')
  async react(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
    @Query('type') type?: string,
  ): Promise<ReactionState> {
    const kind: ReactionKind = reactionKindSchema
      .catch('heart')
      .parse(type);
    return this.communityService.react(user.id, postId, kind);
  }

  @Delete('posts/:postId/reactions')
  async removeReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
    @Query('type') type?: string,
  ): Promise<ReactionState> {
    const kind: ReactionKind = reactionKindSchema
      .catch('heart')
      .parse(type);
    return this.communityService.removeReaction(
      user.id,
      postId,
      kind,
    );
  }
}
