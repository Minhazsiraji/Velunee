jest.mock('@velunee/auth-core', () => ({
  supportsAdmin: (provider: unknown): boolean =>
    provider != null &&
    typeof (provider as { deleteAuthUser?: unknown }).deleteAuthUser === 'function',
}));
import type { AuthenticatedUser } from '@velunee/auth-core';
import { AccountService } from './account.service';
import type { AccountRepository } from './account.repository';

function buildRepository(): jest.Mocked<
  Pick<
    AccountRepository,
    | 'getProfile'
    | 'getPreferences'
    | 'getConversationCount'
    | 'updateProfile'
    | 'updatePreferences'
    | 'deleteUserData'
  >
> {
  return {
    getProfile: jest.fn().mockResolvedValue({
      displayName: 'Minhaz',
      preferredLocale: 'en',
      timezone: 'UTC',
      companionStyle: 'warm',
    }),
    getPreferences: jest.fn().mockResolvedValue({
      answerLength: 'balanced',
      voiceEnabled: true,
      memoryEnabled: true,
      analyticsEnabled: false,
    }),
    getConversationCount: jest.fn().mockResolvedValue(3),
    updateProfile: jest.fn().mockResolvedValue(undefined),
    updatePreferences: jest.fn().mockResolvedValue(undefined),
    deleteUserData: jest.fn().mockResolvedValue(undefined),
  };
}

const baseUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'minhaz@example.com',
  role: 'authenticated',
  claims: { sub: 'user-1' },
};

describe('AccountService', () => {
  it('builds an overview and flags a registered email user', async () => {
    const repository = buildRepository();
    const service = new AccountService(repository as unknown as AccountRepository, null);

    const overview = await service.getOverview(baseUser);

    expect(overview.profile.email).toBe('minhaz@example.com');
    expect(overview.profile.isAnonymous).toBe(false);
    expect(overview.stats.conversationCount).toBe(3);
  });

  it('detects an anonymous guest from the JWT claim', async () => {
    const repository = buildRepository();
    const service = new AccountService(repository as unknown as AccountRepository, null);

    const overview = await service.getOverview({
      ...baseUser,
      email: undefined,
      claims: { sub: 'user-1', is_anonymous: true },
    });

    expect(overview.profile.isAnonymous).toBe(true);
    expect(overview.profile.email).toBeNull();
  });

  it('deletes stored data and the identity-provider user', async () => {
    const repository = buildRepository();
    const deleteAuthUser = jest.fn().mockResolvedValue(undefined);
    const service = new AccountService(
      repository as unknown as AccountRepository,
      { verifyAccessToken: jest.fn(), deleteAuthUser } as never,
    );

    await service.deleteAccount('user-1');

    expect(repository.deleteUserData).toHaveBeenCalledWith('user-1');
    expect(deleteAuthUser).toHaveBeenCalledWith('user-1');
  });

  it('still deletes data when admin deletion is unavailable', async () => {
    const repository = buildRepository();
    const service = new AccountService(
      repository as unknown as AccountRepository,
      { verifyAccessToken: jest.fn() } as never,
    );

    await expect(service.deleteAccount('user-1')).resolves.toBeUndefined();
    expect(repository.deleteUserData).toHaveBeenCalledWith('user-1');
  });
});
