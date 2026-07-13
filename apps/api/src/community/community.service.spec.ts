import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ModerationProvider, ModerationResult } from '@velunee/moderation-core';
import { CommunityService } from './community.service';
import type { CommunityRepository } from './community.repository';

function buildRepository(overrides: Partial<CommunityRepository> = {}): CommunityRepository {
  return {
    enabled: true,
    getFeed: jest.fn().mockResolvedValue({ posts: [], nextCursor: null }),
    createPost: jest.fn().mockResolvedValue({
      id: 'post-1',
      authorName: 'You',
      authorHandle: null,
      caption: 'hello',
      isOwnPost: true,
      reactionCount: 0,
      viewerHasReacted: false,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    }),
    logContentCheck: jest.fn().mockResolvedValue(undefined),
    getModerationQueue: jest.fn().mockResolvedValue([]),
    setModerationStatus: jest.fn().mockResolvedValue(true),
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

function buildModeration(decision: ModerationResult['decision'] = 'approved'): ModerationProvider {
  return {
    checkText: jest.fn().mockResolvedValue({
      decision,
      riskScore: decision === 'approved' ? 0.02 : 0.6,
      categories: decision === 'approved' ? [] : ['profanity'],
      providerReference: 'heuristic',
    } satisfies ModerationResult),
    checkImage: jest.fn(),
  };
}

function buildConfig(adminIds = ''): ConfigService {
  return { get: jest.fn().mockReturnValue(adminIds) } as unknown as ConfigService;
}

function buildService(
  opts: {
    repository?: CommunityRepository;
    moderation?: ModerationProvider;
    config?: ConfigService;
  } = {},
): CommunityService {
  return new CommunityService(
    opts.repository ?? buildRepository(),
    opts.moderation ?? buildModeration(),
    opts.config ?? buildConfig(),
  );
}

describe('CommunityService', () => {
  it('publishes a clean post immediately', async () => {
    const repository = buildRepository();
    const service = buildService({ repository });

    const result = await service.createPost('user-1', 'hello');

    expect(result.underReview).toBe(false);
    expect(repository.createPost).toHaveBeenCalledWith('user-1', 'hello', 'approved');
    expect(repository.logContentCheck).toHaveBeenCalled();
  });

  it('sends flagged content to review instead of the feed', async () => {
    const repository = buildRepository();
    const service = buildService({
      repository,
      moderation: buildModeration('review'),
    });

    const result = await service.createPost('user-1', 'spammy text');

    expect(result.underReview).toBe(true);
    expect(repository.createPost).toHaveBeenCalledWith('user-1', 'spammy text', 'review');
  });

  it('rejects content that violates guidelines', async () => {
    const service = buildService({ moderation: buildModeration('rejected') });

    await expect(service.createPost('user-1', 'threat')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('adds a reaction to an existing post', async () => {
    const repository = buildRepository();
    const service = buildService({ repository });

    const state = await service.react('user-1', 'post-1', 'heart');

    expect(state.viewerHasReacted).toBe(true);
    expect(repository.addReaction).toHaveBeenCalledWith('user-1', 'post-1', 'heart');
  });

  it('rejects reactions on a missing post', async () => {
    const repository = buildRepository({
      postExists: jest.fn().mockResolvedValue(false),
    });
    const service = buildService({ repository });

    await expect(service.react('user-1', 'missing', 'heart')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to create a post when persistence is disabled', async () => {
    const repository = buildRepository({ enabled: false });
    const service = buildService({ repository });

    await expect(service.createPost('user-1', 'hello')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('blocks moderation actions for non-admins', async () => {
    const service = buildService({ config: buildConfig('') });

    await expect(service.getModerationQueue('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets an allowlisted admin approve a post', async () => {
    const repository = buildRepository();
    const service = buildService({
      repository,
      config: buildConfig('admin-1,user-2'),
    });

    const result = await service.moderatePost('admin-1', 'post-1', 'approve');

    expect(result.status).toBe('approved');
    expect(repository.setModerationStatus).toHaveBeenCalledWith('post-1', 'approved');
  });
});
