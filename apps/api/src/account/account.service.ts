import { Inject, Injectable, Logger } from '@nestjs/common';
import { supportsAdmin, type AuthenticatedUser, type AuthProvider } from '@velunee/auth-core';
import type {
  AccountOverviewResponse,
  AccountProfile,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from '@velunee/contracts';
import { AUTH_PROVIDER } from '../auth/auth.constants';
import { AccountRepository } from './account.repository';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly repository: AccountRepository,
    @Inject(AUTH_PROVIDER)
    private readonly authProvider: AuthProvider | null,
  ) {}

  async getOverview(user: AuthenticatedUser): Promise<AccountOverviewResponse> {
    const [profile, preferences, conversationCount] = await Promise.all([
      this.repository.getProfile(user.id),
      this.repository.getPreferences(user.id),
      this.repository.getConversationCount(user.id),
    ]);

    const isAnonymous = user.claims?.is_anonymous === true;

    const fullProfile: AccountProfile = {
      ...profile,
      email: user.email ?? null,
      isAnonymous,
    };

    return {
      profile: fullProfile,
      preferences,
      stats: { conversationCount },
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
    await this.repository.updateProfile(userId, input);
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<void> {
    await this.repository.updatePreferences(userId, input);
  }

  /**
   * Permanently delete the account: first remove owned data from our
   * database, then delete the identity-provider user so the account
   * cannot be used to sign in again.
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.repository.deleteUserData(userId);

    if (supportsAdmin(this.authProvider)) {
      await this.authProvider.deleteAuthUser(userId);
    } else {
      this.logger.warn(
        `Account ${userId} data deleted, but the identity provider ` +
          'user could not be removed because admin access is not ' +
          'configured (SUPABASE_SERVICE_ROLE_KEY missing).',
      );
    }

    this.logger.log(`Account deleted userId=${userId}`);
  }
}
