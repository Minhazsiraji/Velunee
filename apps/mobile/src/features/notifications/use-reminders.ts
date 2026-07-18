import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { loadBills } from '@/features/balance/api';
import { loadNotificationPreferences } from '@/features/notifications/api';
import { loadPlannerDay } from '@/features/planner/api';
import { syncReminders } from '@/lib/reminders';

// Keeps device-scheduled reminders (bills + plan-your-day + task times) in sync
// with the latest data. Runs on mount and whenever the app returns to the
// foreground. Mount once, high in the authenticated tree.
export function useReminders(): void {
  const bills = useQuery({ queryKey: ['reminders', 'bills'], queryFn: () => loadBills() });
  const day = useQuery({ queryKey: ['reminders', 'planner-day'], queryFn: () => loadPlannerDay() });
  const prefs = useQuery({
    queryKey: ['reminders', 'prefs'],
    queryFn: () => loadNotificationPreferences(),
  });

  useEffect(() => {
    if (!bills.data || !day.data || !prefs.data) return;
    void syncReminders({
      currency: 'BDT',
      bills: bills.data.bills.map((bill) => ({
        id: bill.id,
        name: bill.name,
        amountMinor: bill.amountMinor,
        dueDay: bill.dueDay,
      })),
      tasks: [...day.data.tasks, ...day.data.overdue].map((task) => ({
        id: task.id,
        title: task.title,
        dueOn: task.dueOn,
        scheduledTime: task.scheduledTime,
        status: task.status,
      })),
      prefs: { bills: prefs.data.preferences.bills, tasks: prefs.data.preferences.tasks },
    });
  }, [bills.data, day.data, prefs.data]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void bills.refetch();
        void day.refetch();
        void prefs.refetch();
      }
    });
    return () => subscription.remove();
  }, [bills, day, prefs]);
}
