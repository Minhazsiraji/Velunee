import { Injectable, Logger } from '@nestjs/common';
import type {
  HomeBalanceCard,
  HomeBillCard,
  HomeCardPreferences,
  HomeCardsResponse,
  HomeConversationCard,
  HomeOverviewResponse,
  HomeSuggestion,
  HomeWeatherCard,
  UpdateHomeCardsInput,
} from '@velunee/contracts';
import { z } from 'zod';
import { BalanceService } from '../balance/balance.service';
import { formatMinor } from '../balance/balance.math';
import { WeatherService } from '../weather/weather.service';
import { HomeRepository } from './home.repository';

const DEFAULT_CARDS: HomeCardPreferences = {
  weather: true,
  balance: true,
  bills: true,
  recentConversation: true,
  suggestion: true,
};

const hourSchema = z.coerce.number().int().min(0).max(23);
const coordinateSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export interface HomeOverviewQuery {
  today?: string;
  hour?: string;
  latitude?: string;
  longitude?: string;
}

export function greetingTitle(hour: number | null, displayName: string | null): string {
  const name = displayName ? `, ${displayName}` : '';
  if (hour === null) return `Hello${name}`;
  if (hour < 5) return `Hello${name}`;
  if (hour < 12) return `Good morning${name}`;
  if (hour < 17) return `Good afternoon${name}`;
  return `Good evening${name}`;
}

export function weatherAdvice(snapshot: {
  temperatureC: number;
  condition: string | null;
  precipMm: number | null;
}): string | null {
  const rainy =
    (snapshot.precipMm !== null && snapshot.precipMm > 0.2) ||
    (snapshot.condition !== null && /rain|drizzle|thunder|shower/i.test(snapshot.condition));
  if (rainy) {
    return 'Rain around — carrying an umbrella could save you an unplanned ride cost.';
  }
  if (snapshot.temperatureC >= 35) {
    return 'Very hot today — carry water and plan errands for the cooler hours.';
  }
  if (snapshot.temperatureC <= 10) {
    return 'Chilly today — a warm layer will help.';
  }
  return null;
}

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    private readonly repository: HomeRepository,
    private readonly weatherService: WeatherService,
    private readonly balanceService: BalanceService,
  ) {}

  private resolveCards(raw: Record<string, unknown>): HomeCardPreferences {
    return {
      weather: typeof raw.weather === 'boolean' ? raw.weather : DEFAULT_CARDS.weather,
      balance: typeof raw.balance === 'boolean' ? raw.balance : DEFAULT_CARDS.balance,
      bills: typeof raw.bills === 'boolean' ? raw.bills : DEFAULT_CARDS.bills,
      recentConversation:
        typeof raw.recentConversation === 'boolean'
          ? raw.recentConversation
          : DEFAULT_CARDS.recentConversation,
      suggestion: typeof raw.suggestion === 'boolean' ? raw.suggestion : DEFAULT_CARDS.suggestion,
    };
  }

  private async weatherCard(query: HomeOverviewQuery): Promise<HomeWeatherCard | null> {
    const coordinates = coordinateSchema.safeParse({
      latitude: query.latitude,
      longitude: query.longitude,
    });
    if (!coordinates.success) return null;

    const snapshot = await this.weatherService.getSnapshot(
      coordinates.data.latitude,
      coordinates.data.longitude,
    );
    if (!snapshot) return null;

    return {
      locationName: snapshot.locationName,
      temperatureC: snapshot.temperatureC,
      feelsLikeC: snapshot.feelsLikeC,
      condition: snapshot.condition,
      advice: weatherAdvice(snapshot),
    };
  }

  private async balanceCards(
    userId: string,
    today?: string,
  ): Promise<{ balance: HomeBalanceCard; upcomingBill: HomeBillCard | null } | null> {
    try {
      const overview = await this.balanceService.getOverview(userId, { today });
      const bill = overview.upcomingBills[0] ?? null;
      return {
        balance: {
          currency: overview.currency,
          isConfigured: overview.isConfigured,
          safeToSpendTodayMinor: overview.daily.safeToSpendTodayMinor,
          suggestedDailyLimitMinor: overview.daily.suggestedDailyLimitMinor,
          remainingMinor: overview.totals.remainingMinor,
          daysRemaining: overview.daily.daysRemaining,
        },
        upcomingBill: bill
          ? {
              id: bill.id,
              name: bill.name,
              amountMinor: bill.amountMinor,
              currency: overview.currency,
              dueInDays: bill.dueInDays,
            }
          : null,
      };
    } catch (error) {
      this.logger.warn(
        `Balance card unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  private buildSuggestion(input: {
    weather: HomeWeatherCard | null;
    balance: HomeBalanceCard | null;
    upcomingBill: HomeBillCard | null;
  }): HomeSuggestion {
    const { weather, balance, upcomingBill } = input;

    if (upcomingBill && upcomingBill.dueInDays <= 2) {
      const when =
        upcomingBill.dueInDays === 0
          ? 'today'
          : upcomingBill.dueInDays === 1
            ? 'tomorrow'
            : `in ${upcomingBill.dueInDays} days`;
      return {
        id: 'bill-due',
        message: `${upcomingBill.name} (${formatMinor(upcomingBill.currency, upcomingBill.amountMinor)}) is due ${when}.`,
      };
    }

    if (weather?.advice) {
      return { id: 'weather-advice', message: weather.advice };
    }

    if (balance?.isConfigured && balance.remainingMinor < 0) {
      return {
        id: 'balance-recovery',
        message: `You're ${formatMinor(balance.currency, Math.abs(balance.remainingMinor))} over this month's plan. A few lighter days can bring it back.`,
      };
    }

    if (balance?.isConfigured && balance.daysRemaining > 0) {
      return {
        id: 'balance-on-track',
        message: `Keeping today's spending near ${formatMinor(balance.currency, balance.suggestedDailyLimitMinor)} keeps this month's plan on track.`,
      };
    }

    return {
      id: 'ask-velunee',
      message: 'Tell Velunee one thing on your mind — it can help you plan, decide, or track it.',
    };
  }

  async getOverview(userId: string, query: HomeOverviewQuery): Promise<HomeOverviewResponse> {
    const [displayName, rawCards] = await Promise.all([
      this.repository.getDisplayName(userId).catch(() => null),
      this.repository.getCardSettings(userId).catch(() => ({}) as Record<string, unknown>),
    ]);
    const cards = this.resolveCards(rawCards);

    const parsedHour = hourSchema.safeParse(query.hour);
    const hour = parsedHour.success ? parsedHour.data : null;

    const [weather, balanceResult, latestConversation] = await Promise.all([
      cards.weather ? this.weatherCard(query).catch(() => null) : Promise.resolve(null),
      cards.balance || cards.bills ? this.balanceCards(userId, query.today) : Promise.resolve(null),
      cards.recentConversation
        ? this.repository.getLatestConversation(userId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const balance = cards.balance ? (balanceResult?.balance ?? null) : null;
    const upcomingBill = cards.bills ? (balanceResult?.upcomingBill ?? null) : null;

    const recentConversation: HomeConversationCard | null = latestConversation
      ? {
          id: latestConversation.id,
          title: latestConversation.title?.trim() || 'Recent conversation',
          updatedAt: latestConversation.updatedAt.toISOString(),
        }
      : null;

    return {
      greeting: {
        title: greetingTitle(hour, displayName),
        subtitle: null,
      },
      weather,
      balance,
      upcomingBill,
      recentConversation,
      suggestion: cards.suggestion
        ? this.buildSuggestion({ weather, balance, upcomingBill })
        : null,
      cards,
    };
  }

  async getCards(userId: string): Promise<HomeCardsResponse> {
    const raw = await this.repository.getCardSettings(userId);
    return { cards: this.resolveCards(raw) };
  }

  async updateCards(userId: string, input: UpdateHomeCardsInput): Promise<HomeCardsResponse> {
    const changes = Object.fromEntries(
      Object.entries(input).filter(([, value]) => typeof value === 'boolean'),
    ) as Record<string, boolean>;
    await this.repository.setCardSettings(userId, changes);
    return this.getCards(userId);
  }
}
