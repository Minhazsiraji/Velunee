import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  conversations,
  messages,
  users,
  type DatabaseConnection,
} from '@velunee/database';
import { and, eq } from 'drizzle-orm';
import { CryptoService } from '../crypto/crypto.service';
import { DATABASE_CONNECTION } from '../database/database.constants';

export interface PersistedMessageInput {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant';
  inputMode: 'text' | 'voice' | 'image';
  content: string;
  provider?: string;
  model?: string;
  requestId: string;
}

@Injectable()
export class ChatRepository {
  private readonly logger = new Logger(ChatRepository.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly connection: DatabaseConnection | null,
    private readonly crypto: CryptoService,
  ) {}

  get persistenceEnabled(): boolean {
    return this.connection !== null && this.crypto.enabled;
  }

  async ensureConversation(input: {
    conversationId: string;
    userId: string;
    locale?: string;
  }): Promise<void> {
    if (!this.persistenceEnabled || !this.connection) return;

    const { db } = this.connection;
    await db
      .insert(users)
      .values({
        id: input.userId,
        authProviderId: input.userId,
      })
      .onConflictDoNothing();

    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, input.userId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(conversations).values({
        id: input.conversationId,
        userId: input.userId,
        locale: input.locale,
      });
    }
  }

  async saveMessage(input: PersistedMessageInput): Promise<void> {
    if (!this.persistenceEnabled || !this.connection) return;

    await this.connection.db.insert(messages).values({
      id: input.id,
      conversationId: input.conversationId,
      userId: input.userId,
      role: input.role,
      inputMode: input.inputMode,
      contentEncrypted: this.crypto.encrypt(input.content),
      provider: input.provider,
      model: input.model,
      requestId: input.requestId,
    });
  }

  logPersistenceState(): void {
    if (!this.connection) {
      this.logger.warn('Chat persistence is disabled because DATABASE_URL is not configured');
    } else if (!this.crypto.enabled) {
      this.logger.warn('Chat persistence is disabled because FIELD_ENCRYPTION_KEY is not configured');
    }
  }
}
