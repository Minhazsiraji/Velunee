import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CommunityService } from './community.service';
import type { CommunityRepository } from './community.repository';

function buildRepository(overrides: Partial<CommunityRepository> = {}): CommunityRepository {
  return {
    enabled: true,
    getFeed: jest.fn().mockResolvedValue({ posts: [], nextCursor: null }),
    createPost: jest.fn(),
    postExists: jest.fn().mockResolvedValue(true),
    addReaction: jest.fn().mockResolvedValue({
      postId: 'post-1',
      reactionCount: 1,
      viewerHasReacted: true,
    }),
    removeReaction: jest.fn().mockResolvedValue({
      postId: 'post-1',
      reactionCount: 0,
      viewerHasReacted: false,
    }),
    ...overrides,
  } as unknown as CommunityRepository;
}

describe('CommunityService', () => {
  it('adds a reaction to an existing post', async () => {
    const repository = buildRepository();
    const service = new CommunityService(repository);

    const state = await service.react('user-1', 'post-1', 'heart');

    expect(state.viewerHasReacted).toBe(true);
    expect(state.reactionCount).toBe(1);
    expect(repository.addReaction).toHaveBeenCalledWith('user-1', 'post-1', 'heart');
  });

  it('rejects reactions on a missing post', async () => {
    const repository = buildRepository({
      postExists: jest.fn().mockResolvedValue(false),
    });
    const service = new CommunityService(repository);

    await expect(service.react('user-1', 'missing', 'heart')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to create a post when persistence is disabled', async () => {
    const repository = buildRepository({ enabled: false });
    const service = new CommunityService(repository);

    await expect(service.createPost('user-1', 'hello')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
