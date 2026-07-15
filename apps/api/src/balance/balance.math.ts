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
