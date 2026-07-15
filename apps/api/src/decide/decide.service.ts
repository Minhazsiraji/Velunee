import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AIProvider } from '@velunee/ai-core';
import type { AffordabilityResponse, DecideRequestInput, DecideResponse } from '@velunee/contracts';
import { randomUUID } from 'node:crypto';
import { BalanceService } from '../balance/balance.service';
import { AI_PROVIDER } from '../chat/chat.constants';
import { MemoryService } from '../memory/memory.service';
import { WeatherService } from '../weather/weather.service';
import {
  buildConsidered,
  buildDecidePrompt,
  buildDeterministicDecision,
  detectDecisionKind,
  extractAmountMinor,
  parseAiDecision,
  pickNextAction,
  type DecideContext,
  type ParsedDecision,
} from './decide.logic';

const MAX_MEMORY_HIGHLIGHTS = 5;

@Injectable()
export class DecideService {
  private readonly logger = new Logger(DecideService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AIProvider,
    private readonly balanceService: BalanceService,
    private readonly weatherService: WeatherService,
    private readonly memoryService: MemoryService,
  ) {}

  private async safeOverview(userId: string, today?: string) {
    try {
      return await this.balanceService.getOverview(userId, { today });
    } catch {
      return null;
    }
  }

  private async safeWeather(location?: { latitude: number; longitude: number }) {
    if (!location) return null;
    try {
      return await this.weatherService.getSnapshot(location.latitude, location.longitude);
    } catch {
      return null;
    }
  }

  private async memoryHighlights(userId: string): Promise<string[]> {
    try {
      const { memories } = await this.memoryService.list(userId);
      return memories
        .filter((memory) => memory.enabled && memory.allowedFeatures.includes('chat'))
        .slice(0, MAX_MEMORY_HIGHLIGHTS)
        .map((memory) => memory.content);
    } catch {
      return [];
    }
  }

  async decide(userId: string, input: DecideRequestInput): Promise<DecideResponse> {
    const requestId = randomUUID();
    const kind = detectDecisionKind(input.question);

    const [overview, weather, memoryHighlights] = await Promise.all([
      this.safeOverview(userId, input.today),
      this.safeWeather(input.location),
      this.memoryHighlights(userId),
    ]);

    const context: DecideContext = {
      currency: overview?.currency ?? 'BDT',
      balanceConfigured: overview?.isConfigured ?? false,
      safeToSpendTodayMinor: overview?.daily.safeToSpendTodayMinor ?? null,
      remainingMinor: overview?.totals.remainingMinor ?? null,
      weather: weather
        ? {
            temperatureC: weather.temperatureC,
            condition: weather.condition,
            advice: null,
          }
        : null,
      memoryHighlights,
    };

    // Financial verdicts are always deterministic (outline §42).
    let affordability: AffordabilityResponse | null = null;
    if (kind === 'affordability') {
      const amountMinor = extractAmountMinor(input.question);
      if (amountMinor !== null && overview?.isConfigured) {
        affordability = await this.balanceService
          .checkAffordability(userId, { amountMinor }, { today: input.today })
          .catch(() => null);
      }
    }

    const considered = buildConsidered(context);
    const fallback: ParsedDecision = buildDeterministicDecision({ kind, context, affordability });

    let decision = fallback;
    let provider = 'velunee';
    let model = 'deterministic';

    // A money verdict never goes to the model; everything else can be enriched
    // by the AI when one is configured, falling back cleanly otherwise.
    const groundedByBalance = kind === 'affordability' && affordability !== null;
    if (!groundedByBalance && this.ai.name !== 'mock') {
      try {
        const result = await this.ai.generate({
          userId,
          requestId,
          locale: input.locale,
          timezone: input.timezone,
          context: buildDecidePrompt(context),
          messages: [{ role: 'user', content: input.question }],
        });
        const parsed = parseAiDecision(result.text);
        if (parsed) {
          decision = parsed;
          provider = result.provider;
          model = result.model;
        }
      } catch (error) {
        this.logger.warn(
          `Decide AI enrichment failed, using deterministic answer: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    this.logger.log(`Decide requestId=${requestId} kind=${kind} provider=${provider}`);

    return {
      question: input.question,
      kind,
      recommendation: decision.recommendation,
      reasoning: decision.reasoning,
      considered,
      alternative: decision.alternative,
      impact: decision.impact,
      nextAction: pickNextAction(kind, affordability),
      affordability,
      provider,
      model,
      requestId,
    };
  }
}
