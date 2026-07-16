import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAIProvider, type AIProvider } from '@velunee/ai-core';
import { AI_PROVIDER } from '../chat/chat.constants';
import { LearnController } from './learn.controller';
import { LearnRepository } from './learn.repository';
import { LearnService } from './learn.service';

@Module({
  controllers: [LearnController],
  providers: [
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AIProvider =>
        createAIProvider({
          provider: config.get<'mock' | 'gemini'>('AI_PROVIDER') ?? 'mock',
          geminiApiKey: config.get<string>('GEMINI_API_KEY'),
          geminiModel: config.get<string>('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite',
        }),
    },
    LearnService,
    LearnRepository,
  ],
})
export class LearnModule {}
