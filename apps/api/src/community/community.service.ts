import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CommunityFeedResponse,
  CreatePostResponse,
  ModerationActionResponse,
  ModerationQueueResponse,
  ReactionKind,
  ReactionState,
} from '@velunee/contracts';
import type { ModerationProvider } from '@velunee/moderation-core';
import { MODERATION_PROVIDER } from './community.constants';
import { CommunityRepository } from './community.repository';

@Injectable()
export class CommunityService {
  constructor(
    private readonly repository: CommunityRepository,
    @Inject(MODERATION_PROVIDER)
    private readonly moderation: ModerationProvider,
    private readonly config: ConfigService,
  ) {}

  private assertEnabled(): void {
    if (!this.repository.enabled) {
      throw new ServiceUnavailableException('The community is not available right now.');
    }
  }

  private assertAdmin(userId: string): void {
    const raw = this.config.get<string>('ADMIN_USER_IDS') ?? '';
    const admins = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (!admins.includes(userId)) {
      throw new ForbiddenException('You do not have moderation access.');
    }
  }

  async getFeed(userId: string, cursor?: string): Promise<CommunityFeedResponse> {
    return this.repository.getFeed(userId, cursor);
  }

  async createPost(userId: string, caption: string): Promise<CreatePostResponse> {
    this.assertEnabled();

    const result = await this.moderation.checkText(caption);
    if (result.decision === 'rejected') {
      throw new BadRequestException(
        'Your post could not be published because it may violate the community guidelines.',
      );
    }

    const status = result.decision === 'review' ? 'review' : 'approved';
    const post = await this.repository.createPost(userId, caption, status);
    await this.repository.logContentCheck(post.id, result);

    return { post, underReview: status === 'review' };
  }

  async react(userId: string, postId: string, type: ReactionKind): Promise<ReactionState> {
    this.assertEnabled();
    if (!(await this.repository.postExists(postId))) {
      throw new NotFoundException('Post not found');
    }
    return this.repository.addReaction(userId, postId, type);
  }

  async removeReaction(userId: string, postId: string, type: ReactionKind): Promise<ReactionState> {
    this.assertEnabled();
    if (!(await this.repository.postExists(postId))) {
      throw new NotFoundException('Post not found');
    }
    return this.repository.removeReaction(userId, postId, type);
  }

  async getModerationQueue(userId: string): Promise<ModerationQueueResponse> {
    this.assertEnabled();
    this.assertAdmin(userId);
    const posts = await this.repository.getModerationQueue();
    return { posts };
  }

  async moderatePost(
    userId: string,
    postId: string,
    action: 'approve' | 'reject',
  ): Promise<ModerationActionResponse> {
    this.assertEnabled();
    this.assertAdmin(userId);

    const status = action === 'approve' ? 'approved' : 'rejected';
    const updated = await this.repository.setModerationStatus(postId, status);
    if (!updated) {
      throw new NotFoundException('Post not found');
    }
    return { postId, status };
  }
}
