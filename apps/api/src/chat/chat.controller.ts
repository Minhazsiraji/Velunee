import {
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  sendChatMessageSchema,
  type ChatResponse,
  type SendChatMessageInput,
  type StreamChunk,
} from '@velunee/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(sendChatMessageSchema))
    input: SendChatMessageInput,
  ): Promise<ChatResponse> {
    return this.chatService.send(user.id, input);
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

      if (!closed) {
        await session.complete(fullText);
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
