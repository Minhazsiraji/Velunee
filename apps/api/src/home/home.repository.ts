import { Inject, Injectable } from '@nestjs/common';
import {
  conversations,
  preferences as preferencesTable,
  profiles as profilesTable,
  users,
  type DatabaseConnection,
} from '@velunee/database';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';

export interface LatestConversationRow {
  id: string;
  title: string | null;
  updatedAt: Date;
}

const HOME_CARDS_SETTINGS_KEY = 'homeCards';

@Injectable()
export class HomeRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
  ) {}

  async getDisplayName(userId: string): Promise<string | null> {
    if (!this.connection) return null;
    const [row] = await this.connection.db
      .select({ displayName: profilesTable.displayName })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);
    return row?.displayName?.trim() || null;
  }

  async getLatestConversation(userId: string): Promise<LatestConversationRow | null> {
    if (!this.connection) return null;
    const [row] = await this.connection.db
      .select({
        id: conversations.id,
        title: conversations.title,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(and(eq(conversations.userId, userId), isNull(conversations.deletedAt)))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    return row ?? null;
  }

  async getCardSettings(userId: string): Promise<Record<string, unknown>> {
    if (!this.connection) return {};
    const [row] = await this.connection.db
      .select({ settings: preferencesTable.settings })
      .from(preferencesTable)
      .where(eq(preferencesTable.userId, userId))
      .limit(1);

    const stored = row?.settings?.[HOME_CARDS_SETTINGS_KEY];
    return stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  }

  async setCardSettings(userId: string, cards: Record<string, boolean>): Promise<void> {
    if (!this.connection) return;
    const { db } = this.connection;

    await db.insert(users).values({ id: userId, authProviderId: userId }).onConflictDoNothing();
    await db.insert(preferencesTable).values({ userId }).onConflictDoNothing();

    const [row] = await db
      .select({ settings: preferencesTable.settings })
      .from(preferencesTable)
      .where(eq(preferencesTable.userId, userId))
      .limit(1);

    const settings = row?.settings ?? {};
    const existing = settings[HOME_CARDS_SETTINGS_KEY];
    const merged = {
      ...settings,
      [HOME_CARDS_SETTINGS_KEY]: {
        ...(existing && typeof existing === 'object' ? existing : {}),
        ...cards,
      },
    };

    await db
      .update(preferencesTable)
      .set({ settings: merged, updatedAt: new Date() })
      .where(eq(preferencesTable.userId, userId));
  }
}
