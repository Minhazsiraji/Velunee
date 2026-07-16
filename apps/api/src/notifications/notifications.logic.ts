import type { NotificationItem, NotificationPreferences } from '@velunee/contracts';
import { formatMinor } from '../balance/balance.math';

export interface NotificationSignals {
  currency: string;
  bills: { id: string; name: string; amountMinor: number; dueInDays: number }[];
  remainingMinor: number | null;
  overdueTaskCount: number;
  todayRemainingTaskCount: number;
  examDate: string | null;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  bills: true,
  balance: true,
  tasks: true,
  exams: true,
  quietHoursStart: null,
  quietHoursEnd: null,
  lockScreenPrivacy: true,
  dailySummaryOnly: false,
};

function whenText(dueInDays: number): string {
  if (dueInDays <= 0) return 'today';
  if (dueInDays === 1) return 'tomorrow';
  return `in ${dueInDays} days`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function quietHoursActive(
  preferences: NotificationPreferences,
  hour: number | null,
): boolean {
  const { quietHoursStart: start, quietHoursEnd: end } = preferences;
  if (start === null || end === null || hour === null || start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // Overnight window, e.g. 22:00–07:00.
  return hour >= start || hour < end;
}

export function buildNotifications(
  signals: NotificationSignals,
  preferences: NotificationPreferences,
  today: string,
): NotificationItem[] {
  const items: NotificationItem[] = [];

  if (preferences.bills) {
    for (const bill of signals.bills.filter((b) => b.dueInDays <= 3).slice(0, 3)) {
      items.push({
        id: `bill-${bill.id}`,
        category: 'bills',
        tone: 'warning',
        title: 'Bill due soon',
        body: `${bill.name} (${formatMinor(signals.currency, bill.amountMinor)}) is due ${whenText(bill.dueInDays)}.`,
      });
    }
  }

  if (preferences.balance && signals.remainingMinor !== null && signals.remainingMinor < 0) {
    items.push({
      id: 'balance-over',
      category: 'balance',
      tone: 'warning',
      title: "Over this month's plan",
      body: `You're ${formatMinor(signals.currency, Math.abs(signals.remainingMinor))} over. A few lighter days can bring it back.`,
    });
  }

  if (preferences.tasks && signals.overdueTaskCount > 0) {
    items.push({
      id: 'tasks-overdue',
      category: 'tasks',
      tone: 'neutral',
      title: 'Tasks to catch up',
      body: `${signals.overdueTaskCount} ${
        signals.overdueTaskCount === 1 ? 'task has' : 'tasks have'
      } carried over. Move them to today whenever you're ready.`,
    });
  }

  if (preferences.tasks && signals.todayRemainingTaskCount > 0) {
    items.push({
      id: 'tasks-today',
      category: 'tasks',
      tone: 'neutral',
      title: "Today's plan",
      body: `${signals.todayRemainingTaskCount} ${
        signals.todayRemainingTaskCount === 1 ? 'task' : 'tasks'
      } left for today.`,
    });
  }

  if (preferences.exams && signals.examDate) {
    const days = daysBetween(today, signals.examDate);
    if (days >= 0 && days <= 14) {
      items.push({
        id: 'exam-soon',
        category: 'exams',
        tone: days <= 3 ? 'warning' : 'neutral',
        title: 'Exam approaching',
        body:
          days === 0
            ? 'Your exam is today — a calm final review can help.'
            : `Your exam is in ${days} ${days === 1 ? 'day' : 'days'}. A short review today keeps it manageable.`,
      });
    }
  }

  // Warnings first, keeping insertion order within each tone.
  return items.sort((a, b) => (a.tone === 'warning' ? 0 : 1) - (b.tone === 'warning' ? 0 : 1));
}
