import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  ChatMessage,
  ConversationHistoryResponse,
  ConversationListResponse,
} from '@velunee/contracts';
import {
  conversations,
  messages,
  users,
  type DatabaseConnection,
} from '@velunee/database';
import {
  and,
  asc,
  desc,
  eq,
  isNull,
} from 'drizzle-orm';
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

export interface PersistedChatHistory {
  conversationId: string | null;
  messages: ChatMessage[];
}

@Injectable()
export class ChatRepository {
  private readonly logger = new Logger(
    ChatRepository.name,
  );

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection:
      | DatabaseConnection
      | null,
    private readonly crypto: CryptoService,
  ) {}

  get persistenceEnabled(): boolean {
    return (
      this.connection !== null &&
      this.crypto.enabled
    );
  }

  async ensureConversation(input: {
    conversationId: string;
    userId: string;
    locale?: string;
  }): Promise<void> {
    if (
      !this.persistenceEnabled ||
      !this.connection
    ) {
      return;
    }

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
      .where(
        and(
          eq(
            conversations.id,
            input.conversationId,
          ),
          eq(
            conversations.userId,
            input.userId,
          ),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(conversations).values({
        id: input.conversationId,
        userId: input.userId,
        locale: input.locale,
      });
    }
  }

  async saveMessage(
    input: PersistedMessageInput,
  ): Promise<void> {
    if (
      !this.persistenceEnabled ||
      !this.connection
    ) {
      return;
    }

    const { db } = this.connection;

    await db.insert(messages).values({
      id: input.id,
      conversationId: input.conversationId,
      userId: input.userId,
      role: input.role,
      inputMode: input.inputMode,
      contentEncrypted: this.crypto.encrypt(
        input.content,
      ),
      provider: input.provider,
      model: input.model,
      requestId: input.requestId,
    });

    await db
      .update(conversations)
      .set({
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            conversations.id,
            input.conversationId,
          ),
          eq(
            conversations.userId,
            input.userId,
          ),
        ),
      );
  }

  async getLatestHistory(
    userId: string,
  ): Promise<PersistedChatHistory> {
    if (
      !this.persistenceEnabled ||
      !this.connection
    ) {
      return {
        conversationId: null,
        messages: [],
      };
    }

    const { db } = this.connection;

    const [conversation] = await db
      .select({
        id: conversations.id,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          isNull(conversations.deletedAt),
        ),
      )
      .orderBy(
        desc(conversations.updatedAt),
        desc(conversations.createdAt),
      )
      .limit(1);

    if (!conversation) {
      return {
        conversationId: null,
        messages: [],
      };
    }

    const storedMessages = await db
      .select({
        id: messages.id,
        role: messages.role,
        inputMode: messages.inputMode,
        contentEncrypted:
          messages.contentEncrypted,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          eq(
            messages.conversationId,
            conversation.id,
          ),
          eq(messages.userId, userId),
          isNull(messages.deletedAt),
        ),
      )
      .orderBy(asc(messages.createdAt));

    const historyMessages =
      storedMessages.flatMap<ChatMessage>(
        (message) => {
          if (message.role === 'tool') {
            return [];
          }

          return [
            {
              id: message.id,
              role: message.role,
              content: this.crypto.decrypt(
                message.contentEncrypted,
              ),
              inputMode: message.inputMode,
              createdAt:
                message.createdAt.toISOString(),
            },
          ];
        },
      );

    return {
      conversationId: conversation.id,
      messages: historyMessages,
    };
  }

  async listConversations(
    userId: string,
  ): Promise<ConversationListResponse> {
    if (
      !this.persistenceEnabled ||
      !this.connection
    ) {
      return { conversations: [] };
    }

    const { db } = this.connection;

    const storedConversations = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          isNull(conversations.deletedAt),
        ),
      )
      .orderBy(
        desc(conversations.updatedAt),
        desc(conversations.createdAt),
      );

    const items = await Promise.all(
      storedConversations.map(
        async (conversation) => {
          const storedMessages = await db
            .select({
              contentEncrypted:
                messages.contentEncrypted,
              role: messages.role,
            })
            .from(messages)
            .where(
              and(
                eq(
                  messages.conversationId,
                  conversation.id,
                ),
                eq(messages.userId, userId),
                isNull(messages.deletedAt),
              ),
            )
            .orderBy(asc(messages.createdAt));

          const visibleMessages =
            storedMessages.filter(
              (message) =>
                message.role !== 'tool',
            );

          const firstUserMessage =
            visibleMessages.find(
              (message) =>
                message.role === 'user',
            );

          const lastMessage =
            visibleMessages.at(-1);

          const firstUserContent =
            firstUserMessage
              ? this.crypto.decrypt(
                  firstUserMessage.contentEncrypted,
                )
              : '';

          const lastContent = lastMessage
            ? this.crypto.decrypt(
                lastMessage.contentEncrypted,
              )
            : '';

          const generatedTitle =
            firstUserContent
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 60) ||
            'New conversation';

          const preview = lastContent
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);

          return {
            id: conversation.id,
            title:
              conversation.title?.trim() ||
              generatedTitle,
            preview,
            messageCount:
              visibleMessages.length,
            createdAt:
              conversation.createdAt.toISOString(),
            updatedAt:
              conversation.updatedAt.toISOString(),
          };
        },
      ),
    );

    return { conversations: items };
  }

  async getConversationHistory(
    userId: string,
    conversationId: string,
  ): Promise<ConversationHistoryResponse | null> {
    if (
      !this.persistenceEnabled ||
      !this.connection
    ) {
      return null;
    }

    const { db } = this.connection;

    const [conversation] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
          isNull(conversations.deletedAt),
        ),
      )
      .limit(1);

    if (!conversation) {
      return null;
    }

    const storedMessages = await db
      .select({
        id: messages.id,
        role: messages.role,
        inputMode: messages.inputMode,
        contentEncrypted:
          messages.contentEncrypted,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          eq(
            messages.conversationId,
            conversationId,
          ),
          eq(messages.userId, userId),
          isNull(messages.deletedAt),
        ),
      )
      .orderBy(asc(messages.createdAt));

    const historyMessages =
      storedMessages.flatMap<ChatMessage>(
        (message) => {
          if (message.role === 'tool') {
            return [];
          }

          return [
            {
              id: message.id,
              role: message.role,
              content: this.crypto.decrypt(
                message.contentEncrypted,
              ),
              inputMode: message.inputMode,
              createdAt:
                message.createdAt.toISOString(),
            },
          ];
        },
      );

    return {
      conversationId,
      messages: historyMessages,
    };
  }

  logPersistenceState(): void {
    if (!this.connection) {
      this.logger.warn(
        'Chat persistence is disabled because DATABASE_URL is not configured',
      );
    } else if (!this.crypto.enabled) {
      this.logger.warn(
        'Chat persistence is disabled because FIELD_ENCRYPTION_KEY is not configured',
      );
    }
  }
}
