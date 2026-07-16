import type { ConfigService } from '@nestjs/config';
import type { ModerationProvider } from '@velunee/moderation-core';
import { CommunityService } from './community.service';
import type { CommunityRepository } from './community.repository';

function buildService(repo: Partial<CommunityRepository>): CommunityService {
  const repository = { enabled: true, ...repo } as unknown as CommunityRepository;
  const moderation = {} as ModerationProvider;
  const config = { get: () => '' } as unknown as ConfigService;
  return new CommunityService(repository, moderation, config);
}

const VIEWER = 'viewer-1';
const POST = '11111111-1111-4111-8111-111111111111';

describe('CommunityService safety', () => {
  it('blocks the author of a post', async () => {
    const blockUser = jest.fn().mockResolvedValue(undefined);
    const service = buildService({
      postAuthorId: jest.fn().mockResolvedValue('author-9'),
      blockUser,
    });

    const result = await service.blockPostAuthor(VIEWER, POST);

    expect(result).toEqual({ userId: 'author-9', blocked: true });
    expect(blockUser).toHaveBeenCalledWith(VIEWER, 'author-9');
  });

  it('refuses to block yourself', async () => {
    const service = buildService({
      postAuthorId: jest.fn().mockResolvedValue(VIEWER),
      blockUser: jest.fn(),
    });

    await expect(service.blockPostAuthor(VIEWER, POST)).rejects.toThrow(/yourself/i);
  });

  it('records a report but leaves the post visible below the review threshold', async () => {
    const flagForReview = jest.fn();
    const service = buildService({
      postAuthorId: jest.fn().mockResolvedValue('author-9'),
      reportPost: jest.fn().mockResolvedValue(1),
      flagForReview,
    });

    const result = await service.reportPost(VIEWER, POST, { reason: 'spam' });

    expect(result).toEqual({ reported: true, underReview: false });
    expect(flagForReview).not.toHaveBeenCalled();
  });

  it('sends a post to review once enough people report it', async () => {
    const flagForReview = jest.fn().mockResolvedValue(undefined);
    const service = buildService({
      postAuthorId: jest.fn().mockResolvedValue('author-9'),
      reportPost: jest.fn().mockResolvedValue(2),
      flagForReview,
    });

    const result = await service.reportPost(VIEWER, POST, { reason: 'harassment' });

    expect(result.underReview).toBe(true);
    expect(flagForReview).toHaveBeenCalledWith(POST);
  });

  it('refuses to report your own post', async () => {
    const service = buildService({
      postAuthorId: jest.fn().mockResolvedValue(VIEWER),
      reportPost: jest.fn(),
    });

    await expect(service.reportPost(VIEWER, POST, { reason: 'spam' })).rejects.toThrow(
      /your own post/i,
    );
  });
});
