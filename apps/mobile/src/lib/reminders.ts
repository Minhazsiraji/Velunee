import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatMinor } from '@/features/balance/format';

// Show reminders as banners even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'reminders';

export interface ReminderBill {
  id: string;
  name: string;
  amountMinor: number;
  dueDay: number;
}

export interface ReminderTask {
  id: string;
  title: string;
  dueOn: string;
  scheduledTime: string | null;
  status: 'todo' | 'done';
}

export interface ReminderPrefs {
  bills: boolean;
  tasks: boolean;
}

// Ask for notification permission (and set the Android channel). Returns whether
// notifications are allowed.
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function clampedDate(year: number, month: number, day: number, hour: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), hour, 0, 0, 0);
}

// The 9am on the day the bill is next due (this month if still ahead, else next).
function nextBillDueAt9am(dueDay: number, now: Date): Date {
  const thisMonth = clampedDate(now.getFullYear(), now.getMonth(), dueDay, 9);
  if (thisMonth.getTime() > now.getTime()) return thisMonth;
  return clampedDate(now.getFullYear(), now.getMonth() + 1, dueDay, 9);
}

async function schedule(title: string, body: string, date: Date): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CHANNEL_ID,
    },
  });
}

// Rebuild all reminders from the current bills/tasks. Idempotent: cancels every
// scheduled reminder first, then re-schedules, so it stays in sync each app open.
export async function syncReminders(input: {
  currency: string;
  bills: ReminderBill[];
  tasks: ReminderTask[];
  prefs: ReminderPrefs;
}): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  // Plan-your-day: a daily 8am nudge.
  if (input.prefs.tasks) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Plan your day',
        body: 'Open Velunee to see your tasks and set today up.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  }

  // Upcoming bills: remind the day before at 9am (or on the day if that's past).
  if (input.prefs.bills) {
    for (const bill of input.bills) {
      const due = nextBillDueAt9am(bill.dueDay, now);
      const dayBefore = new Date(due.getTime() - 86_400_000);
      const when = dayBefore.getTime() > now.getTime() ? dayBefore : due;
      if (when.getTime() <= now.getTime()) continue;
      const soon = when.getTime() === due.getTime() ? 'today' : 'tomorrow';
      await schedule(
        'Bill due soon',
        `${bill.name} (${formatMinor(input.currency, bill.amountMinor)}) is due ${soon}.`,
        when,
      );
    }
  }

  // Today's scheduled tasks: remind at their time.
  if (input.prefs.tasks) {
    for (const task of input.tasks) {
      if (task.status === 'done' || !task.scheduledTime) continue;
      const [hour, minute] = task.scheduledTime.split(':').map(Number) as [number, number];
      const [year, month, day] = task.dueOn.split('-').map(Number) as [number, number, number];
      const when = new Date(year, month - 1, day, hour, minute, 0, 0);
      if (when.getTime() <= now.getTime()) continue;
      await schedule('Task reminder', task.title, when);
    }
  }
}
