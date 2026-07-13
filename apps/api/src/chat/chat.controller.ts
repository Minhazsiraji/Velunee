import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  renameConversationSchema,
  sendChatMessageSchema,
  visionRequestSchema,
  type ChatHistoryResponse,
  type ChatResponse,
  type ConversationHistoryResponse,
  type ConversationListResponse,
  type ConversationMutationResponse,
  type RenameConversationInput,
  type SendChatMessageInput,
  type StreamChunk,
  type VisionRequestInput,
  type VisionResponse,
} from '@velunee/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history')
  async getHistory(@CurrentUser() user: AuthenticatedUser): Promise<ChatHistoryResponse> {
    return this.chatService.getLatestHistory(user.id);
  }

  @Get('conversations')
  async listConversations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationListResponse> {
    return this.chatService.listConversations(user.id);
  }

  @Get('conversations/:conversationId')
  async getConversationHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId')
    conversationId: string,
  ): Promise<ConversationHistoryResponse> {
    const history = await this.chatService.getConversationHistory(user.id, conversationId);

    if (!history) {
      throw new NotFoundException('Conversation not found');
    }

    return history;
  }

  @Patch('conversations/:conversationId')
  async renameConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId')
    conversationId: string,
    @Body(new ZodValidationPipe(renameConversationSchema))
    input: RenameConversationInput,
  ): Promise<ConversationMutationResponse> {
    const renamed = await this.chatService.renameConversation(user.id, conversationId, input.title);

    if (!renamed) {
      throw new NotFoundException('Conversation not found');
    }

    return { conversationId };
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId')
    conversationId: string,
  ): Promise<ConversationMutationResponse> {
    const deleted = await this.chatService.deleteConversation(user.id, conversationId);

    if (!deleted) {
      throw new NotFoundException('Conversation not found');
    }

    return { conversationId };
  }

  @Post('messages')
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(sendChatMessageSchema))
    input: SendChatMessageInput,
  ): Promise<ChatResponse> {
    return this.chatService.send(user.id, input);
  }

  @Post('vision')
  async analyzeImage(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(visionRequestSchema))
    input: VisionRequestInput,
  ): Promise<VisionResponse> {
    return this.chatService.analyzeImage(user.id, input);
  }

  @Post('stream')
  async streamMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(sendChatMessageSchema))
    input: SendChatMessageInput,
    @Res() response: Response,
  ): Promise<void> {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    const write = (event: StreamChunk): void => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    let closed = false;
    response.on('close', () => {
      if (!response.writableEnded) closed = true;
    });

    try {
      const session = await this.chatService.createStream(user.id, input);
      write({
        type: 'meta',
        conversationId: session.conversationId,
        requestId: session.requestId,
      });

      let fullText = '';
      for await (const chunk of session.chunks) {
        if (closed) break;
        fullText += chunk.text;
        write({ type: 'delta', delta: chunk.text });
      }

      if (fullText.trim()) {
        await session.complete(fullText);
      }

      if (!closed) {
        write({
          type: 'done',
          messageId: session.messageId,
          provider: session.provider,
          model: session.model,
        });
      }
    } catch (error) {
      if (!closed) {
        write({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to generate a response',
        });
      }
    } finally {
      response.end();
    }
  }
}
