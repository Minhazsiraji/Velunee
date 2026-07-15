import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAIProvider, type AIProvider } from '@velunee/ai-core';
import { BalanceModule } from '../balance/balance.module';
import { AI_PROVIDER } from '../chat/chat.constants';
import { MemoryModule } from '../memory/memory.module';
import { WeatherModule } from '../weather/weather.module';
import { DecideController } from './decide.controller';
import { DecideService } from './decide.service';

@Module({
  imports: [BalanceModule, WeatherModule, MemoryModule],
  controllers: [DecideController],
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
    DecideService,
  ],
})
export class DecideModule {}
