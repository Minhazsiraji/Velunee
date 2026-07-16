import type { NotificationPreferences } from '@velunee/contracts';
import {
  buildNotifications,
  DEFAULT_NOTIFICATION_PREFERENCES,
  quietHoursActive,
  type NotificationSignals,
} from './notifications.logic';

const TODAY = '2026-07-16';

function signals(overrides: Partial<NotificationSignals> = {}): NotificationSignals {
  return {
    currency: 'BDT',
    bills: [],
    remainingMinor: null,
    overdueTaskCount: 0,
    todayRemainingTaskCount: 0,
    examDate: null,
    ...overrides,
  };
}

function prefs(overrides: Partial<NotificationPreferences> = {}): NotificationPreferences {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...overrides };
}

describe('quietHoursActive', () => {
  it('handles daytime and overnight windows', () => {
    expect(quietHoursActive(prefs({ quietHoursStart: 9, quietHoursEnd: 17 }), 12)).toBe(true);
    expect(quietHoursActive(prefs({ quietHoursStart: 9, quietHoursEnd: 17 }), 20)).toBe(false);
    expect(quietHoursActive(prefs({ quietHoursStart: 22, quietHoursEnd: 7 }), 23)).toBe(true);
    expect(quietHoursActive(prefs({ quietHoursStart: 22, quietHoursEnd: 7 }), 5)).toBe(true);
    expect(quietHoursActive(prefs({ quietHoursStart: 22, quietHoursEnd: 7 }), 9)).toBe(false);
  });

  it('is off when unset', () => {
    expect(quietHoursActive(prefs(), 12)).toBe(false);
  });
});

describe('buildNotifications', () => {
  it('surfaces a bill due within three days as a warning', () => {
    const items = buildNotifications(
      signals({ bills: [{ id: 'b1', name: 'Electricity', amountMinor: 1_500_00, dueInDays: 1 }] }),
      prefs(),
      TODAY,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ category: 'bills', tone: 'warning' });
    expect(items[0]!.body).toContain('Electricity');
    expect(items[0]!.body).toContain('tomorrow');
  });

  it('ignores bills that are not due soon', () => {
    const items = buildNotifications(
      signals({ bills: [{ id: 'b1', name: 'Rent', amountMinor: 1, dueInDays: 20 }] }),
      prefs(),
      TODAY,
    );
    expect(items).toHaveLength(0);
  });

  it('warns when over the monthly plan', () => {
    const items = buildNotifications(signals({ remainingMinor: -5_000_00 }), prefs(), TODAY);
    expect(items[0]).toMatchObject({ category: 'balance', tone: 'warning' });
    expect(items[0]!.body).toContain('over');
  });

  it('surfaces overdue tasks and an upcoming exam, and orders warnings first', () => {
    const items = buildNotifications(
      signals({ overdueTaskCount: 2, examDate: '2026-07-18' }),
      prefs(),
      TODAY,
    );
    const categories = items.map((i) => i.category);
    expect(categories).toContain('tasks');
    expect(categories).toContain('exams');
    // Exam in 2 days is a warning, so it sorts before the neutral task item.
    expect(items[0]!.tone).toBe('warning');
  });

  it('respects category preferences', () => {
    const off = buildNotifications(
      signals({ bills: [{ id: 'b1', name: 'Gas', amountMinor: 1, dueInDays: 0 }] }),
      prefs({ bills: false }),
      TODAY,
    );
    expect(off).toHaveLength(0);
  });

  it('does not flag an exam far in the future', () => {
    const items = buildNotifications(signals({ examDate: '2026-09-01' }), prefs(), TODAY);
    expect(items.some((i) => i.category === 'exams')).toBe(false);
  });
});
