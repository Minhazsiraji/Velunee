import { Inject, Injectable } from '@nestjs/common';
import { preferences as preferencesTable, users, type DatabaseConnection } from '@velunee/database';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';

const SETTINGS_KEY = 'notifications';

@Injectable()
export class NotificationsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
  ) {}

  async getPreferences(userId: string): Promise<Record<string, unknown>> {
    if (!this.connection) return {};
    const [row] = await this.connection.db
      .select({ settings: preferencesTable.settings })
      .from(preferencesTable)
      .where(eq(preferencesTable.userId, userId))
      .limit(1);
    const stored = row?.settings?.[SETTINGS_KEY];
    return stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  }

  async setPreferences(userId: string, patch: Record<string, unknown>): Promise<void> {
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
    const existing = settings[SETTINGS_KEY];
    const merged = {
      ...settings,
      [SETTINGS_KEY]: {
        ...(existing && typeof existing === 'object' ? existing : {}),
        ...patch,
      },
    };

    await db
      .update(preferencesTable)
      .set({ settings: merged, updatedAt: new Date() })
      .where(eq(preferencesTable.userId, userId));
  }
}
