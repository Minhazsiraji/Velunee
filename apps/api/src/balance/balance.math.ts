export interface MonthWindow {
  month: string;
  from: string;
  to: string;
  today: string;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  isCurrentMonth: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysInMonthOf(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

export function previousMonthOf(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

// `today` lets the client supply its local date so day boundaries follow the
// user's timezone instead of the server's.
export function resolveMonthWindow(month?: string, today?: string): MonthWindow {
  const todayIso = today ?? isoToday();
  const resolvedMonth = month ?? todayIso.slice(0, 7);
  const daysInMonth = daysInMonthOf(resolvedMonth);
  const from = `${resolvedMonth}-01`;
  const to = `${resolvedMonth}-${pad(daysInMonth)}`;

  const todayMonth = todayIso.slice(0, 7);
  const isCurrentMonth = todayMonth === resolvedMonth;

  let daysElapsed: number;
  let daysRemaining: number;
  if (isCurrentMonth) {
    const dayOfMonth = Number(todayIso.slice(8, 10));
    daysElapsed = Math.min(dayOfMonth, daysInMonth);
    daysRemaining = Math.max(daysInMonth - dayOfMonth + 1, 0);
  } else if (todayMonth > resolvedMonth) {
    daysElapsed = daysInMonth;
    daysRemaining = 0;
  } else {
    daysElapsed = 0;
    daysRemaining = daysInMonth;
  }

  return {
    month: resolvedMonth,
    from,
    to,
    today: todayIso,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    isCurrentMonth,
  };
}

export function formatMinor(currency: string, amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);
  const whole = Math.floor(absolute / 100);
  const cents = absolute % 100;
  const wholeFormatted = whole.toLocaleString('en-US');
  return cents > 0
    ? `${sign}${currency} ${wholeFormatted}.${String(cents).padStart(2, '0')}`
    : `${sign}${currency} ${wholeFormatted}`;
}

export interface OverviewNumbersInput {
  monthlyIncomeMinor: number;
  extraIncomeMinor: number;
  spentMinor: number;
  fixedEstimateMinor: number;
  fixedSpentMinor: number;
  variableSpentTodayMinor: number;
  savingsTargetMinor: number;
  window: MonthWindow;
}

export interface OverviewNumbers {
  incomeMinor: number;
  fixedReservedMinor: number;
  variableSpentMinor: number;
  remainingMinor: number;
  suggestedDailyLimitMinor: number;
  safeToSpendTodayMinor: number;
  averageDailySpendMinor: number;
  projectedMonthEndBalanceMinor: number;
}

// Fixed costs (rent, EMI, school fees…) are reserved up front so the daily
// limit only budgets everyday variable spending. Until the user records the
// actual fixed payments, the profile estimate holds their place; once actual
// fixed spending exceeds the estimate, the larger number wins.
export function computeOverviewNumbers(input: OverviewNumbersInput): OverviewNumbers {
  const { window } = input;
  const incomeMinor = input.monthlyIncomeMinor + input.extraIncomeMinor;
  const fixedReservedMinor = Math.max(input.fixedEstimateMinor, input.fixedSpentMinor);
  const variableSpentMinor = Math.max(0, input.spentMinor - input.fixedSpentMinor);

  const availableForDailyMinor = incomeMinor - input.savingsTargetMinor - fixedReservedMinor;
  const remainingMinor = availableForDailyMinor - variableSpentMinor;

  // The daily limit is computed before today's variable spending so "safe to
  // spend today" can subtract it without counting today twice.
  const remainingBeforeToday = remainingMinor + input.variableSpentTodayMinor;
  const suggestedDailyLimitMinor =
    window.daysRemaining > 0
      ? Math.max(0, Math.floor(remainingBeforeToday / window.daysRemaining))
      : 0;
  const safeToSpendTodayMinor = Math.max(
    0,
    suggestedDailyLimitMinor - input.variableSpentTodayMinor,
  );

  const averageDailySpendMinor =
    window.daysElapsed > 0 ? Math.round(variableSpentMinor / window.daysElapsed) : 0;

  let projectedMonthEndBalanceMinor: number;
  if (!window.isCurrentMonth || window.daysElapsed === 0) {
    projectedMonthEndBalanceMinor = remainingMinor;
  } else {
    projectedMonthEndBalanceMinor =
      availableForDailyMinor - averageDailySpendMinor * window.daysInMonth;
  }

  return {
    incomeMinor,
    fixedReservedMinor,
    variableSpentMinor,
    remainingMinor,
    suggestedDailyLimitMinor,
    safeToSpendTodayMinor,
    averageDailySpendMinor,
    projectedMonthEndBalanceMinor,
  };
}

// Next due date for a bill given the day of month it repeats on. Due days past
// the end of a month clamp to that month's last day (e.g. day 31 in February).
export function dueInDays(dueDay: number, today: string): number {
  const todayDay = Number(today.slice(8, 10));
  const month = today.slice(0, 7);
  const currentMonthDays = daysInMonthOf(month);
  const dueThisMonth = Math.min(dueDay, currentMonthDays);

  if (dueThisMonth >= todayDay) {
    return dueThisMonth - todayDay;
  }

  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
  const nextMonth = `${nextMonthDate.getUTCFullYear()}-${pad(nextMonthDate.getUTCMonth() + 1)}`;
  const dueNextMonth = Math.min(dueDay, daysInMonthOf(nextMonth));
  return currentMonthDays - todayDay + dueNextMonth;
}

export function estimatedMonthsRemaining(goal: {
  targetMinor: number;
  savedMinor: number;
  monthlyContributionMinor: number;
}): number | null {
  if (goal.savedMinor >= goal.targetMinor) return 0;
  if (goal.monthlyContributionMinor <= 0) return null;
  return Math.ceil((goal.targetMinor - goal.savedMinor) / goal.monthlyContributionMinor);
}

// ---------------------------------------------------------------------------
// Velunee Balance signature functions (improvement outline §13). All pure and
// deterministic so every verdict can be explained.
// ---------------------------------------------------------------------------

export type MoneyWeatherState = 'sunny' | 'partly' | 'cloudy' | 'stormy';

export interface MoneyWeather {
  state: MoneyWeatherState;
  message: string;
}

// A one-glance financial forecast for the rest of the month.
export function computeMoneyWeather(input: {
  remainingMinor: number;
  suggestedDailyLimitMinor: number;
  averageDailySpendMinor: number;
  daysElapsed: number;
  budgetsOverLimit: number;
}): MoneyWeather {
  if (input.remainingMinor < 0) {
    return {
      state: 'stormy',
      message: "Stormy — you're past this month's plan. Recovery mode can bring it back.",
    };
  }

  const enoughHistory = input.daysElapsed >= 3;
  const paceRatio =
    input.suggestedDailyLimitMinor > 0
      ? input.averageDailySpendMinor / input.suggestedDailyLimitMinor
      : 0;

  if (input.budgetsOverLimit > 0 || (enoughHistory && paceRatio > 1.25)) {
    return {
      state: 'cloudy',
      message: 'Cloudy — spending is running ahead of your plan. A lighter day or two helps.',
    };
  }

  if (enoughHistory && paceRatio > 1) {
    return {
      state: 'partly',
      message: 'Partly cloudy — slightly ahead of your daily pace, still recoverable.',
    };
  }

  return { state: 'sunny', message: 'Sunny — your money is on track this month.' };
}

export interface RecoveryPlan {
  overspendMinor: number;
  dailyCutMinor: number;
  message: string;
}

// A concrete, supportive path back after overspending.
export function computeRecovery(input: {
  remainingMinor: number;
  daysRemaining: number;
  currency: string;
}): RecoveryPlan | null {
  if (input.remainingMinor >= 0) return null;

  const overspendMinor = Math.abs(input.remainingMinor);

  if (input.daysRemaining <= 0) {
    return {
      overspendMinor,
      dailyCutMinor: 0,
      message: `This month closed ${formatMinor(input.currency, overspendMinor)} over plan. A fresh plan next month resets it — no need to carry guilt forward.`,
    };
  }

  const dailyCutMinor = Math.ceil(overspendMinor / input.daysRemaining);
  return {
    overspendMinor,
    dailyCutMinor,
    message: `Spending about ${formatMinor(input.currency, dailyCutMinor)} less each day for the next ${input.daysRemaining} days brings this month back on plan.`,
  };
}

// How long total savings could cover daily life if income stopped.
export function computeSafetyDays(input: {
  totalSavedMinor: number;
  averageDailySpendMinor: number;
  fixedExpensesMinor: number;
}): number | null {
  const dailyBurnMinor =
    input.averageDailySpendMinor + Math.round(input.fixedExpensesMinor / 30);
  if (input.totalSavedMinor <= 0 || dailyBurnMinor <= 0) return null;
  return Math.floor(input.totalSavedMinor / dailyBurnMinor);
}

export interface AffordabilityGoalImpact {
  goalId: string;
  name: string;
  delayDays: number;
}

export interface AffordabilityResult {
  verdict: 'yes' | 'careful' | 'no';
  title: string;
  explanation: string;
  goalImpacts: AffordabilityGoalImpact[];
  calculation: string[];
}

// "Can I afford this?" — a clear verdict with the reasoning shown.
export function computeAffordability(input: {
  amountMinor: number;
  remainingMinor: number;
  safeToSpendTodayMinor: number;
  daysRemaining: number;
  currency: string;
  goals: Array<{ id: string; name: string; monthlyContributionMinor: number }>;
}): AffordabilityResult {
  const { amountMinor, currency } = input;
  const remaining = Math.max(0, input.remainingMinor);

  const goalImpacts: AffordabilityGoalImpact[] = input.goals
    .filter((goal) => goal.monthlyContributionMinor > 0)
    .slice(0, 3)
    .map((goal) => ({
      goalId: goal.id,
      name: goal.name,
      delayDays: Math.ceil((amountMinor * 30) / goal.monthlyContributionMinor),
    }));

  const calculation = [
    `Purchase amount = ${formatMinor(currency, amountMinor)}`,
    `Remaining in this month's plan = ${formatMinor(currency, input.remainingMinor)}`,
    `Safe to spend today = ${formatMinor(currency, input.safeToSpendTodayMinor)}`,
  ];

  if (amountMinor <= input.safeToSpendTodayMinor) {
    calculation.push('Verdict: amount ≤ safe to spend today');
    return {
      verdict: 'yes',
      title: 'Yes, comfortably',
      explanation: "It fits inside today's safe-to-spend amount without touching the rest of your plan.",
      goalImpacts,
      calculation,
    };
  }

  if (amountMinor <= remaining) {
    const newDailyLimitMinor =
      input.daysRemaining > 0
        ? Math.max(0, Math.floor((remaining - amountMinor) / input.daysRemaining))
        : 0;
    calculation.push(
      `Verdict: amount ≤ remaining; daily limit afterwards = (remaining − amount) ÷ ${input.daysRemaining} days = ${formatMinor(currency, newDailyLimitMinor)}`,
    );
    return {
      verdict: 'careful',
      title: 'Yes, but plan for it',
      explanation: `It fits this month's plan, but it's bigger than today's limit — your daily limit drops to about ${formatMinor(currency, newDailyLimitMinor)} afterwards.`,
      goalImpacts,
      calculation,
    };
  }

  const shortfallMinor = amountMinor - remaining;
  calculation.push(
    `Verdict: amount exceeds remaining by ${formatMinor(currency, shortfallMinor)}`,
  );
  return {
    verdict: 'no',
    title: "Not within this month's plan",
    explanation: `It's ${formatMinor(currency, shortfallMinor)} more than what's left in your plan. Waiting, or adjusting your plan first, would be safer.`,
    goalImpacts,
    calculation,
  };
}
