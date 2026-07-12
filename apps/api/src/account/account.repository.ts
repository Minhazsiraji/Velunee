import { Inject, Injectable } from '@nestjs/common';
import type {
  AccountPreferences,
  AccountProfile,
  CompanionStyle,
  AnswerLength,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from '@velunee/contracts';
import {
  conversations,
  preferences as preferencesTable,
  profiles as profilesTable,
  users,
  type DatabaseConnection,
} from '@velunee/database';
import { and, count, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';

const DEFAULT_PROFILE = {
  displayName: null as string | null,
  preferredLocale: 'en',
  timezone: 'UTC',
  companionStyle: 'warm' as CompanionStyle,
};

const DEFAULT_PREFERENCES: AccountPreferences = {
  answerLength: 'balanced',
  voiceEnabled: true,
  memoryEnabled: true,
  analyticsEnabled: false,
};

@Injectable()
export class AccountRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
  ) {}

  get persistenceEnabled(): boolean {
    return this.connection !== null;
  }

  private async ensureRows(userId: string): Promise<void> {
    if (!this.connection) return;
    const { db } = this.connection;

    await db.insert(users).values({ id: userId, authProviderId: userId }).onConflictDoNothing();
    await db.insert(profilesTable).values({ userId }).onConflictDoNothing();
    await db.insert(preferencesTable).values({ userId }).onConflictDoNothing();
  }

  async getProfile(userId: string): Promise<Omit<AccountProfile, 'email' | 'isAnonymous'>> {
    if (!this.connection) return { ...DEFAULT_PROFILE };
    const { db } = this.connection;

    const [row] = await db
      .select({
        displayName: profilesTable.displayName,
        preferredLocale: profilesTable.preferredLocale,
        timezone: profilesTable.timezone,
        companionStyle: profilesTable.companionStyle,
      })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (!row) return { ...DEFAULT_PROFILE };

    return {
      displayName: row.displayName ?? null,
      preferredLocale: row.preferredLocale,
      timezone: row.timezone,
      companionStyle: row.companionStyle as CompanionStyle,
    };
  }

  async getPreferences(userId: string): Promise<AccountPreferences> {
    if (!this.connection) return { ...DEFAULT_PREFERENCES };
    const { db } = this.connection;

    const [row] = await db
      .select({
        answerLength: preferencesTable.answerLength,
        voiceEnabled: preferencesTable.voiceEnabled,
        memoryEnabled: preferencesTable.memoryEnabled,
        analyticsEnabled: preferencesTable.analyticsEnabled,
      })
      .from(preferencesTable)
      .where(eq(preferencesTable.userId, userId))
      .limit(1);

    if (!row) return { ...DEFAULT_PREFERENCES };

    return {
      answerLength: row.answerLength as AnswerLength,
      voiceEnabled: row.voiceEnabled,
      memoryEnabled: row.memoryEnabled,
      analyticsEnabled: row.analyticsEnabled,
    };
  }

  async getConversationCount(userId: string): Promise<number> {
    if (!this.connection) return 0;
    const { db } = this.connection;

    const [row] = await db
      .select({ value: count() })
      .from(conversations)
      .where(and(eq(conversations.userId, userId), isNull(conversations.deletedAt)));

    return row?.value ?? 0;
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
    if (!this.connection) return;
    await this.ensureRows(userId);
    const { db } = this.connection;

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.displayName !== undefined) {
      patch.displayName = input.displayName || null;
    }
    if (input.preferredLocale !== undefined) {
      patch.preferredLocale = input.preferredLocale;
    }
    if (input.timezone !== undefined) {
      patch.timezone = input.timezone;
    }
    if (input.companionStyle !== undefined) {
      patch.companionStyle = input.companionStyle;
    }

    await db.update(profilesTable).set(patch).where(eq(profilesTable.userId, userId));
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<void> {
    if (!this.connection) return;
    await this.ensureRows(userId);
    const { db } = this.connection;

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.answerLength !== undefined) {
      patch.answerLength = input.answerLength;
    }
    if (input.voiceEnabled !== undefined) {
      patch.voiceEnabled = input.voiceEnabled;
    }
    if (input.memoryEnabled !== undefined) {
      patch.memoryEnabled = input.memoryEnabled;
    }
    if (input.analyticsEnabled !== undefined) {
      patch.analyticsEnabled = input.analyticsEnabled;
    }

    await db.update(preferencesTable).set(patch).where(eq(preferencesTable.userId, userId));
  }

  /**
   * Hard-delete the user row. All owned data (profiles, preferences,
   * conversations, messages, memories, reminders, posts, follows,
   * usage) is removed by the ON DELETE CASCADE foreign keys.
   */
  async deleteUserData(userId: string): Promise<void> {
    if (!this.connection) return;
    const { db } = this.connection;
    await db.delete(users).where(eq(users.id, userId));
  }
}
