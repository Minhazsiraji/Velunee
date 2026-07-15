import { Inject, Injectable } from '@nestjs/common';
import type { MemoryType } from '@velunee/contracts';
import { memories, users, type DatabaseConnection } from '@velunee/database';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { CryptoService } from '../crypto/crypto.service';
import { DATABASE_CONNECTION } from '../database/database.constants';

export interface MemoryRow {
  id: string;
  type: MemoryType;
  content: string;
  enabled: boolean;
  allowedFeatures: string[];
  sourceMessageId: string | null;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

const NOT_CONFIGURED = 'Memory persistence is not configured';

@Injectable()
export class MemoryRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
    private readonly crypto: CryptoService,
  ) {}

  get enabled(): boolean {
    return this.connection !== null && this.crypto.enabled;
  }

  private async ensureUser(userId: string): Promise<void> {
    if (!this.connection) return;
    await this.connection.db
      .insert(users)
      .values({ id: userId, authProviderId: userId })
      .onConflictDoNothing();
  }

  async list(userId: string): Promise<MemoryRow[]> {
    if (!this.enabled || !this.connection) return [];

    const rows = await this.connection.db
      .select({
        id: memories.id,
        type: memories.type,
        contentEncrypted: memories.contentEncrypted,
        enabled: memories.enabled,
        allowedFeatures: memories.allowedFeatures,
        sourceMessageId: memories.sourceMessageId,
        lastUsedAt: memories.lastUsedAt,
        expiresAt: memories.expiresAt,
        createdAt: memories.createdAt,
      })
      .from(memories)
      .where(and(eq(memories.userId, userId), isNull(memories.deletedAt)))
      .orderBy(desc(memories.createdAt));

    return rows.map((row) => ({
      id: row.id,
      type: row.type as MemoryType,
      content: this.crypto.decrypt(row.contentEncrypted),
      enabled: row.enabled,
      allowedFeatures: row.allowedFeatures,
      sourceMessageId: row.sourceMessageId,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    }));
  }

  async create(
    userId: string,
    input: {
      type: MemoryType;
      content: string;
      allowedFeatures: string[];
      expiresAt: Date | null;
    },
  ): Promise<MemoryRow> {
    if (!this.enabled || !this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    await this.ensureUser(userId);

    const [row] = await this.connection.db
      .insert(memories)
      .values({
        userId,
        type: input.type,
        contentEncrypted: this.crypto.encrypt(input.content),
        allowedFeatures: input.allowedFeatures,
        expiresAt: input.expiresAt,
        consentStatus: 'granted',
      })
      .returning({ id: memories.id, createdAt: memories.createdAt });

    if (!row) {
      throw new Error('Memory could not be saved');
    }

    return {
      id: row.id,
      type: input.type,
      content: input.content,
      enabled: true,
      allowedFeatures: input.allowedFeatures,
      sourceMessageId: null,
      lastUsedAt: null,
      expiresAt: input.expiresAt,
      createdAt: row.createdAt,
    };
  }

  async update(
    userId: string,
    memoryId: string,
    patch: {
      type?: MemoryType;
      content?: string;
      enabled?: boolean;
      allowedFeatures?: string[];
    },
  ): Promise<MemoryRow | null> {
    if (!this.enabled || !this.connection) {
      throw new Error(NOT_CONFIGURED);
    }

    const updated = await this.connection.db
      .update(memories)
      .set({
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.content !== undefined
          ? { contentEncrypted: this.crypto.encrypt(patch.content) }
          : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...(patch.allowedFeatures !== undefined ? { allowedFeatures: patch.allowedFeatures } : {}),
      })
      .where(
        and(eq(memories.id, memoryId), eq(memories.userId, userId), isNull(memories.deletedAt)),
      )
      .returning({
        id: memories.id,
        type: memories.type,
        contentEncrypted: memories.contentEncrypted,
        enabled: memories.enabled,
        allowedFeatures: memories.allowedFeatures,
        sourceMessageId: memories.sourceMessageId,
        lastUsedAt: memories.lastUsedAt,
        expiresAt: memories.expiresAt,
        createdAt: memories.createdAt,
      });

    const row = updated[0];
    if (!row) return null;

    return {
      id: row.id,
      type: row.type as MemoryType,
      content: this.crypto.decrypt(row.contentEncrypted),
      enabled: row.enabled,
      allowedFeatures: row.allowedFeatures,
      sourceMessageId: row.sourceMessageId,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }

  async softDelete(userId: string, memoryId: string): Promise<boolean> {
    if (!this.enabled || !this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    const updated = await this.connection.db
      .update(memories)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(memories.id, memoryId), eq(memories.userId, userId), isNull(memories.deletedAt)),
      )
      .returning({ id: memories.id });
    return updated.length > 0;
  }

  async clearAll(userId: string): Promise<number> {
    if (!this.enabled || !this.connection) {
      throw new Error(NOT_CONFIGURED);
    }
    const updated = await this.connection.db
      .update(memories)
      .set({ deletedAt: new Date() })
      .where(and(eq(memories.userId, userId), isNull(memories.deletedAt)))
      .returning({ id: memories.id });
    return updated.length;
  }
}
