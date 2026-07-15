import {
  computeAffordability,
  computeMoneyWeather,
  computeOverviewNumbers,
  computeRecovery,
  computeSafetyDays,
  dueInDays,
  estimatedMonthsRemaining,
  formatMinor,
  previousMonthOf,
  resolveMonthWindow,
} from './balance.math';

describe('resolveMonthWindow', () => {
  it('describes the current month from the client-supplied date', () => {
    const window = resolveMonthWindow(undefined, '2026-07-14');

    expect(window.month).toBe('2026-07');
    expect(window.from).toBe('2026-07-01');
    expect(window.to).toBe('2026-07-31');
    expect(window.daysInMonth).toBe(31);
    expect(window.daysElapsed).toBe(14);
    expect(window.daysRemaining).toBe(18);
    expect(window.isCurrentMonth).toBe(true);
  });

  it('treats a past month as fully elapsed', () => {
    const window = resolveMonthWindow('2026-06', '2026-07-14');

    expect(window.daysElapsed).toBe(30);
    expect(window.daysRemaining).toBe(0);
    expect(window.isCurrentMonth).toBe(false);
  });

  it('handles February in a leap year', () => {
    const window = resolveMonthWindow('2028-02', '2028-02-01');
    expect(window.daysInMonth).toBe(29);
  });
});

describe('computeOverviewNumbers', () => {
  const window = resolveMonthWindow(undefined, '2026-07-14');

  it('reproduces the documented plan example', () => {
    // Income 60,000; fixed expenses 25,000; savings goal 10,000
    // => 25,000 available for daily spending across the days of the month.
    const monthStart = resolveMonthWindow(undefined, '2026-07-01');
    const numbers = computeOverviewNumbers({
      monthlyIncomeMinor: 60_000_00,
      extraIncomeMinor: 0,
      spentMinor: 0,
      fixedEstimateMinor: 25_000_00,
      fixedSpentMinor: 0,
      variableSpentTodayMinor: 0,
      savingsTargetMinor: 10_000_00,
      window: monthStart,
    });

    expect(numbers.incomeMinor).toBe(60_000_00);
    expect(numbers.fixedReservedMinor).toBe(25_000_00);
    expect(numbers.remainingMinor).toBe(25_000_00);
    // ~BDT 806 per day across July's 31 days (the plan's "about 833" used 30).
    expect(numbers.suggestedDailyLimitMinor).toBe(Math.floor(25_000_00 / 31));
    expect(numbers.safeToSpendTodayMinor).toBe(numbers.suggestedDailyLimitMinor);
  });

  it('uses actual fixed spending once it exceeds the estimate', () => {
    const numbers = computeOverviewNumbers({
      monthlyIncomeMinor: 60_000_00,
      extraIncomeMinor: 0,
      spentMinor: 28_000_00,
      fixedEstimateMinor: 25_000_00,
      fixedSpentMinor: 27_000_00,
      variableSpentTodayMinor: 0,
      savingsTargetMinor: 10_000_00,
      window,
    });

    expect(numbers.fixedReservedMinor).toBe(27_000_00);
    expect(numbers.variableSpentMinor).toBe(1_000_00);
    // 60,000 - 10,000 - 27,000 - 1,000 = 22,000 remaining.
    expect(numbers.remainingMinor).toBe(22_000_00);
  });

  it('does not double count money already spent today', () => {
    const numbers = computeOverviewNumbers({
      monthlyIncomeMinor: 60_000_00,
      extraIncomeMinor: 0,
      spentMinor: 25_000_00,
      fixedEstimateMinor: 0,
      fixedSpentMinor: 0,
      variableSpentTodayMinor: 1_000_00,
      savingsTargetMinor: 10_000_00,
      window,
    });

    // Remaining before today: 60,000 - 24,000 - 10,000 = 26,000 across 18 days.
    const expectedLimit = Math.floor(26_000_00 / 18);
    expect(numbers.suggestedDailyLimitMinor).toBe(expectedLimit);
    expect(numbers.safeToSpendTodayMinor).toBe(Math.max(0, expectedLimit - 1_000_00));
  });

  it('never suggests a negative daily limit', () => {
    const numbers = computeOverviewNumbers({
      monthlyIncomeMinor: 10_000_00,
      extraIncomeMinor: 0,
      spentMinor: 20_000_00,
      fixedEstimateMinor: 0,
      fixedSpentMinor: 0,
      variableSpentTodayMinor: 0,
      savingsTargetMinor: 0,
      window,
    });

    expect(numbers.remainingMinor).toBe(-10_000_00);
    expect(numbers.suggestedDailyLimitMinor).toBe(0);
    expect(numbers.safeToSpendTodayMinor).toBe(0);
  });
});

describe('dueInDays', () => {
  it('counts down to a due day later this month', () => {
    expect(dueInDays(20, '2026-07-14')).toBe(6);
  });

  it('is zero on the due day itself', () => {
    expect(dueInDays(14, '2026-07-14')).toBe(0);
  });

  it('rolls into the next month when the due day has passed', () => {
    // 31 - 14 remaining in July + 5 days of August.
    expect(dueInDays(5, '2026-07-14')).toBe(22);
  });

  it('clamps due days beyond the end of the month', () => {
    expect(dueInDays(31, '2026-02-10')).toBe(18);
  });
});

describe('estimatedMonthsRemaining', () => {
  it('matches the documented goal example', () => {
    // Target 50,000; saved 20,000; 5,000 per month => 6 months.
    expect(
      estimatedMonthsRemaining({
        targetMinor: 50_000_00,
        savedMinor: 20_000_00,
        monthlyContributionMinor: 5_000_00,
      }),
    ).toBe(6);
  });

  it('is zero once achieved and null without a contribution', () => {
    expect(
      estimatedMonthsRemaining({
        targetMinor: 100,
        savedMinor: 100,
        monthlyContributionMinor: 0,
      }),
    ).toBe(0);
    expect(
      estimatedMonthsRemaining({
        targetMinor: 200,
        savedMinor: 100,
        monthlyContributionMinor: 0,
      }),
    ).toBeNull();
  });
});

describe('formatMinor', () => {
  it('formats whole and fractional amounts', () => {
    expect(formatMinor('BDT', 83_333)).toBe('BDT 833.33');
    expect(formatMinor('BDT', 5_000_000)).toBe('BDT 50,000');
    expect(formatMinor('BDT', -1_050)).toBe('-BDT 10.50');
  });
});

describe('previousMonthOf', () => {
  it('handles the year boundary', () => {
    expect(previousMonthOf('2026-01')).toBe('2025-12');
    expect(previousMonthOf('2026-07')).toBe('2026-06');
  });
});

describe('computeMoneyWeather', () => {
  const base = {
    remainingMinor: 20_000_00,
    suggestedDailyLimitMinor: 1_000_00,
    averageDailySpendMinor: 800_00,
    daysElapsed: 10,
    budgetsOverLimit: 0,
  };

  it('is sunny when spending is on pace', () => {
    expect(computeMoneyWeather(base).state).toBe('sunny');
  });

  it('is partly cloudy slightly over pace and cloudy well over', () => {
    expect(computeMoneyWeather({ ...base, averageDailySpendMinor: 1_100_00 }).state).toBe('partly');
    expect(computeMoneyWeather({ ...base, averageDailySpendMinor: 1_400_00 }).state).toBe('cloudy');
  });

  it('is cloudy when any budget is blown and stormy when over plan', () => {
    expect(computeMoneyWeather({ ...base, budgetsOverLimit: 1 }).state).toBe('cloudy');
    expect(computeMoneyWeather({ ...base, remainingMinor: -1 }).state).toBe('stormy');
  });

  it('does not judge pace in the first days of the month', () => {
    expect(
      computeMoneyWeather({ ...base, daysElapsed: 1, averageDailySpendMinor: 3_000_00 }).state,
    ).toBe('sunny');
  });
});

describe('computeRecovery', () => {
  it('is null while the plan is intact', () => {
    expect(computeRecovery({ remainingMinor: 100, daysRemaining: 10, currency: 'BDT' })).toBeNull();
  });

  it('spreads the overspend across the remaining days', () => {
    const plan = computeRecovery({ remainingMinor: -9_000_00, daysRemaining: 18, currency: 'BDT' });
    expect(plan?.overspendMinor).toBe(9_000_00);
    expect(plan?.dailyCutMinor).toBe(Math.ceil(9_000_00 / 18));
    expect(plan?.message).toContain('18 days');
  });

  it('stays supportive when the month is already over', () => {
    const plan = computeRecovery({ remainingMinor: -5_000_00, daysRemaining: 0, currency: 'BDT' });
    expect(plan?.dailyCutMinor).toBe(0);
    expect(plan?.message).toContain('next month');
  });
});

describe('computeSafetyDays', () => {
  it('divides savings by the daily burn including fixed costs', () => {
    // 30,000 saved; 500/day variable + 15,000/30 fixed = 1,000/day burn.
    expect(
      computeSafetyDays({
        totalSavedMinor: 30_000_00,
        averageDailySpendMinor: 500_00,
        fixedExpensesMinor: 15_000_00,
      }),
    ).toBe(30);
  });

  it('is null without savings or spending data', () => {
    expect(
      computeSafetyDays({
        totalSavedMinor: 0,
        averageDailySpendMinor: 500_00,
        fixedExpensesMinor: 0,
      }),
    ).toBeNull();
    expect(
      computeSafetyDays({
        totalSavedMinor: 10_000_00,
        averageDailySpendMinor: 0,
        fixedExpensesMinor: 0,
      }),
    ).toBeNull();
  });
});

describe('computeAffordability', () => {
  const goalId = '44444444-4444-4444-8444-444444444444';
  const base = {
    remainingMinor: 15_000_00,
    safeToSpendTodayMinor: 800_00,
    daysRemaining: 15,
    currency: 'BDT',
    goals: [{ id: goalId, name: 'Travel', monthlyContributionMinor: 6_000_00 }],
  };

  it('says yes when the amount fits today', () => {
    const result = computeAffordability({ ...base, amountMinor: 500_00 });
    expect(result.verdict).toBe('yes');
  });

  it('says careful for amounts that fit the month but not the day', () => {
    const result = computeAffordability({ ...base, amountMinor: 6_000_00 });
    expect(result.verdict).toBe('careful');
    expect(result.explanation).toContain('daily limit');
  });

  it('says no beyond the remaining plan and shows the shortfall', () => {
    const result = computeAffordability({ ...base, amountMinor: 20_000_00 });
    expect(result.verdict).toBe('no');
    expect(result.calculation.some((line) => line.includes('exceeds remaining'))).toBe(true);
  });

  it('reports the documented goal delay ("may delay your travel goal")', () => {
    // 1,000 purchase against 6,000/month contribution = 5 days of saving.
    const result = computeAffordability({ ...base, amountMinor: 1_000_00 });
    expect(result.goalImpacts).toEqual([{ goalId, name: 'Travel', delayDays: 5 }]);
  });
});
