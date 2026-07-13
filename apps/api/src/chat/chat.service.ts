import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { AIProvider } from '@velunee/ai-core';
import type {
  ChatHistoryResponse,
  ChatResponse,
  ConversationHistoryResponse,
  ConversationListResponse,
  SendChatMessageInput,
  VisionRequestInput,
  VisionResponse,
} from '@velunee/contracts';
import { randomUUID } from 'node:crypto';
import { WeatherService } from '../weather/weather.service';
import { AI_PROVIDER } from './chat.constants';
import { ChatRepository } from './chat.repository';

export interface ChatStreamSession {
  conversationId: string;
  requestId: string;
  messageId: string;
  provider: string;
  model: string;
  chunks: AsyncIterable<{ text: string }>;
  complete(fullText: string): Promise<void>;
}

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AIProvider,
    private readonly repository: ChatRepository,
    private readonly weather: WeatherService,
  ) {}

  private async resolveContext(input: SendChatMessageInput): Promise<string | undefined> {
    if (!input.location) return undefined;
    const context = await this.weather.getContext(
      input.location.latitude,
      input.location.longitude,
    );
    return context ?? undefined;
  }

  onModuleInit(): void {
    this.logger.log(`AI provider: ${this.ai.name}/${this.ai.model}`);
    this.repository.logPersistenceState();
  }

  async getLatestHistory(userId: string): Promise<ChatHistoryResponse> {
    return this.repository.getLatestHistory(userId);
  }

  async listConversations(userId: string): Promise<ConversationListResponse> {
    return this.repository.listConversations(userId);
  }

  async getConversationHistory(
    userId: string,
    conversationId: string,
  ): Promise<ConversationHistoryResponse | null> {
    return this.repository.getConversationHistory(userId, conversationId);
  }

  async renameConversation(
    userId: string,
    conversationId: string,
    title: string,
  ): Promise<boolean> {
    return this.repository.renameConversation(userId, conversationId, title);
  }

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    return this.repository.deleteConversation(userId, conversationId);
  }

  async analyzeImage(userId: string, input: VisionRequestInput): Promise<VisionResponse> {
    const requestId = randomUUID();
    const result = await this.ai.analyzeImage({
      userId,
      requestId,
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
      prompt: input.prompt,
      mode: input.mode,
      locale: input.locale,
    });

    this.logger.log(`Vision analyzed requestId=${requestId} mode=${input.mode}`);

    return {
      text: result.text,
      provider: result.provider,
      model: result.model,
      requestId,
    };
  }

  async send(userId: string, input: SendChatMessageInput): Promise<ChatResponse> {
    const conversationId = input.conversationId ?? randomUUID();
    const requestId = randomUUID();
    const userMessageId = randomUUID();
    const assistantMessageId = randomUUID();
    const startedAt = Date.now();

    await this.repository.ensureConversation({
      conversationId,
      userId,
      locale: input.locale,
    });
    await this.repository.saveMessage({
      id: userMessageId,
      conversationId,
      userId,
      role: 'user',
      inputMode: input.inputMode,
      content: input.message,
      requestId,
    });

    const context = await this.resolveContext(input);

    const result = await this.ai.generate({
      userId,
      requestId,
      locale: input.locale,
      timezone: input.timezone,
      context,
      messages: [...(input.history ?? []), { role: 'user' as const, content: input.message }],
    });

    await this.repository.saveMessage({
      id: assistantMessageId,
      conversationId,
      userId,
      role: 'assistant',
      inputMode: 'text',
      content: result.text,
      provider: result.provider,
      model: result.model,
      requestId,
    });

    this.logger.log(
      `Chat completed requestId=${requestId} provider=${result.provider} latencyMs=${Date.now() - startedAt}`,
    );

    return {
      conversationId,
      requestId,
      provider: result.provider,
      model: result.model,
      message: {
        id: assistantMessageId,
        role: 'assistant',
        content: result.text,
        inputMode: 'text',
        createdAt: new Date().toISOString(),
      },
    };
  }

  async createStream(userId: string, input: SendChatMessageInput): Promise<ChatStreamSession> {
    const conversationId = input.conversationId ?? randomUUID();
    const requestId = randomUUID();
    const userMessageId = randomUUID();
    const assistantMessageId = randomUUID();

    await this.repository.ensureConversation({ conversationId, userId, locale: input.locale });
    await this.repository.saveMessage({
      id: userMessageId,
      conversationId,
      userId,
      role: 'user',
      inputMode: input.inputMode,
      content: input.message,
      requestId,
    });

    const context = await this.resolveContext(input);

    const chunks = this.ai.stream({
      userId,
      requestId,
      locale: input.locale,
      timezone: input.timezone,
      context,
      messages: [...(input.history ?? []), { role: 'user' as const, content: input.message }],
    });

    return {
      conversationId,
      requestId,
      messageId: assistantMessageId,
      provider: this.ai.name,
      model: this.ai.model,
      chunks,
      complete: async (fullText: string) => {
        await this.repository.saveMessage({
          id: assistantMessageId,
          conversationId,
          userId,
          role: 'assistant',
          inputMode: 'text',
          content: fullText,
          provider: this.ai.name,
          model: this.ai.model,
          requestId,
        });
      },
    };
  }
}
