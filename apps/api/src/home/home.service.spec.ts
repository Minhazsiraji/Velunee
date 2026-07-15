import type { BalanceOverviewResponse } from '@velunee/contracts';
import type { BalanceService } from '../balance/balance.service';
import type { WeatherService } from '../weather/weather.service';
import type { HomeRepository } from './home.repository';
import { greetingTitle, HomeService, weatherAdvice } from './home.service';

function buildRepository(
  overrides: Partial<Record<'displayName' | 'cards' | 'conversation', unknown>> = {},
): HomeRepository {
  return {
    getDisplayName: jest.fn().mockResolvedValue(overrides.displayName ?? 'Mim'),
    getCardSettings: jest.fn().mockResolvedValue(overrides.cards ?? {}),
    getLatestConversation: jest.fn().mockResolvedValue(
      overrides.conversation === undefined
        ? {
            id: '11111111-1111-4111-8111-111111111111',
            title: 'Weekend plan',
            updatedAt: new Date('2026-07-14T10:00:00Z'),
          }
        : overrides.conversation,
    ),
    setCardSettings: jest.fn().mockResolvedValue(undefined),
  } as unknown as HomeRepository;
}

function buildWeather(snapshot: unknown = null): WeatherService {
  return {
    getSnapshot: jest.fn().mockResolvedValue(snapshot),
  } as unknown as WeatherService;
}

function balanceOverview(overrides: {
  remainingMinor?: number;
  isConfigured?: boolean;
  bills?: Array<{ id: string; name: string; amountMinor: number; dueDay: number; dueInDays: number }>;
}): BalanceOverviewResponse {
  return {
    month: '2026-07',
    currency: 'BDT',
    isConfigured: overrides.isConfigured ?? true,
    totals: {
      incomeMinor: 60_000_00,
      extraIncomeMinor: 0,
      spentMinor: 10_000_00,
      fixedReservedMinor: 25_000_00,
      variableSpentMinor: 10_000_00,
      savingsTargetMinor: 10_000_00,
      remainingMinor: overrides.remainingMinor ?? 15_000_00,
    },
    daily: {
      daysInMonth: 31,
      daysElapsed: 14,
      daysRemaining: 18,
      suggestedDailyLimitMinor: 833_00,
      spentTodayMinor: 0,
      safeToSpendTodayMinor: 833_00,
      averageDailySpendMinor: 700_00,
      projectedMonthEndBalanceMinor: 3_000_00,
    },
    topCategories: [],
    budgets: [],
    upcomingBills: overrides.bills ?? [],
    insights: [],
    calculation: [],
  };
}

function buildBalance(overview: BalanceOverviewResponse | Error): BalanceService {
  return {
    getOverview:
      overview instanceof Error
        ? jest.fn().mockRejectedValue(overview)
        : jest.fn().mockResolvedValue(overview),
  } as unknown as BalanceService;
}

describe('greetingTitle', () => {
  it('greets by time of day and name', () => {
    expect(greetingTitle(8, 'Mim')).toBe('Good morning, Mim');
    expect(greetingTitle(13, 'Mim')).toBe('Good afternoon, Mim');
    expect(greetingTitle(20, null)).toBe('Good evening');
    expect(greetingTitle(null, null)).toBe('Hello');
  });
});

describe('weatherAdvice', () => {
  it('suggests an umbrella when rain is around', () => {
    expect(
      weatherAdvice({ temperatureC: 28, condition: 'Light rain', precipMm: 0 }),
    ).toContain('umbrella');
    expect(weatherAdvice({ temperatureC: 28, condition: 'Cloudy', precipMm: 1.4 })).toContain(
      'umbrella',
    );
  });

  it('warns about heat and stays quiet on a mild day', () => {
    expect(weatherAdvice({ temperatureC: 37, condition: 'Sunny', precipMm: 0 })).toContain('hot');
    expect(weatherAdvice({ temperatureC: 24, condition: 'Sunny', precipMm: 0 })).toBeNull();
  });
});

describe('HomeService.getOverview', () => {
  const uuid = '22222222-2222-4222-8222-222222222222';

  it('composes every card when sources are available', async () => {
    const service = new HomeService(
      buildRepository(),
      buildWeather({
        locationName: 'Dhaka',
        temperatureC: 30,
        feelsLikeC: 34,
        condition: 'Partly cloudy',
        precipMm: 0,
      }),
      buildBalance(balanceOverview({})),
    );

    const overview = await service.getOverview('user-1', {
      today: '2026-07-14',
      hour: '9',
      latitude: '23.8',
      longitude: '90.4',
    });

    expect(overview.greeting.title).toBe('Good morning, Mim');
    expect(overview.weather?.locationName).toBe('Dhaka');
    expect(overview.balance?.safeToSpendTodayMinor).toBe(833_00);
    expect(overview.recentConversation?.title).toBe('Weekend plan');
    expect(overview.suggestion?.id).toBe('balance-on-track');
  });

  it('hides cards the user has turned off', async () => {
    const service = new HomeService(
      buildRepository({ cards: { weather: false, balance: false, suggestion: false } }),
      buildWeather({
        locationName: 'Dhaka',
        temperatureC: 30,
        feelsLikeC: null,
        condition: null,
        precipMm: 0,
      }),
      buildBalance(balanceOverview({})),
    );

    const overview = await service.getOverview('user-1', {
      latitude: '23.8',
      longitude: '90.4',
    });

    expect(overview.weather).toBeNull();
    expect(overview.balance).toBeNull();
    expect(overview.suggestion).toBeNull();
    expect(overview.cards.weather).toBe(false);
  });

  it('prioritises a due bill over other suggestions', async () => {
    const service = new HomeService(
      buildRepository(),
      buildWeather({
        locationName: 'Dhaka',
        temperatureC: 28,
        feelsLikeC: null,
        condition: 'Rain',
        precipMm: 2,
      }),
      buildBalance(
        balanceOverview({
          bills: [{ id: uuid, name: 'Electricity', amountMinor: 1_500_00, dueDay: 16, dueInDays: 1 }],
        }),
      ),
    );

    const overview = await service.getOverview('user-1', { today: '2026-07-14' });

    expect(overview.suggestion?.id).toBe('bill-due');
    expect(overview.suggestion?.message).toContain('Electricity');
    expect(overview.suggestion?.message).toContain('tomorrow');
  });

  it('still renders when the balance service fails', async () => {
    const service = new HomeService(
      buildRepository({ conversation: null }),
      buildWeather(null),
      buildBalance(new Error('database offline')),
    );

    const overview = await service.getOverview('user-1', { hour: '20' });

    expect(overview.greeting.title).toBe('Good evening, Mim');
    expect(overview.balance).toBeNull();
    expect(overview.upcomingBill).toBeNull();
    expect(overview.suggestion?.id).toBe('ask-velunee');
  });
});
