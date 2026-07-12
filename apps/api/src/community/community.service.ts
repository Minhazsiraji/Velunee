import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  CommunityFeedResponse,
  CommunityPost,
  ReactionKind,
  ReactionState,
} from '@velunee/contracts';
import { CommunityRepository } from './community.repository';

@Injectable()
export class CommunityService {
  constructor(private readonly repository: CommunityRepository) {}

  private assertEnabled(): void {
    if (!this.repository.enabled) {
      throw new ServiceUnavailableException(
        'The community is not available right now.',
      );
    }
  }

  async getFeed(
    userId: string,
    cursor?: string,
  ): Promise<CommunityFeedResponse> {
    return this.repository.getFeed(userId, cursor);
  }

  async createPost(
    userId: string,
    caption: string,
  ): Promise<CommunityPost> {
    this.assertEnabled();
    return this.repository.createPost(userId, caption);
  }

  async react(
    userId: string,
    postId: string,
    type: ReactionKind,
  ): Promise<ReactionState> {
    this.assertEnabled();
    if (!(await this.repository.postExists(postId))) {
      throw new NotFoundException('Post not found');
    }
    return this.repository.addReaction(userId, postId, type);
  }

  async removeReaction(
    userId: string,
    postId: string,
    type: ReactionKind,
  ): Promise<ReactionState> {
    this.assertEnabled();
    if (!(await this.repository.postExists(postId))) {
      throw new NotFoundException('Post not found');
    }
    return this.repository.removeReaction(userId, postId, type);
  }
}
