import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationPreferences,
  NotificationPreferencesResponse,
  NotificationsResponse,
  UpdateNotificationPreferencesInput,
} from '@velunee/contracts';
import { BalanceService } from '../balance/balance.service';
import { LearnService } from '../learn/learn.service';
import { PlannerService } from '../planner/planner.service';
import {
  buildNotifications,
  DEFAULT_NOTIFICATION_PREFERENCES,
  quietHoursActive,
  type NotificationSignals,
} from './notifications.logic';
import { NotificationsRepository } from './notifications.repository';

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly balanceService: BalanceService,
    private readonly plannerService: PlannerService,
    private readonly learnService: LearnService,
  ) {}

  private resolvePreferences(raw: Record<string, unknown>): NotificationPreferences {
    const bool = (key: keyof NotificationPreferences): boolean =>
      typeof raw[key] === 'boolean'
        ? (raw[key] as boolean)
        : (DEFAULT_NOTIFICATION_PREFERENCES[key] as boolean);
    const hour = (key: keyof NotificationPreferences): number | null =>
      typeof raw[key] === 'number' ? (raw[key] as number) : null;

    return {
      bills: bool('bills'),
      balance: bool('balance'),
      tasks: bool('tasks'),
      exams: bool('exams'),
      quietHoursStart: hour('quietHoursStart'),
      quietHoursEnd: hour('quietHoursEnd'),
      lockScreenPrivacy: bool('lockScreenPrivacy'),
      dailySummaryOnly: bool('dailySummaryOnly'),
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreferencesResponse> {
    const raw = await this.repository.getPreferences(userId).catch(() => ({}));
    return { preferences: this.resolvePreferences(raw) };
  }

  async updatePreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferencesResponse> {
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );
    await this.repository.setPreferences(userId, patch);
    return this.getPreferences(userId);
  }

  private async gatherSignals(userId: string, today: string): Promise<NotificationSignals> {
    const [overview, day, learner] = await Promise.all([
      this.balanceService.getOverview(userId, { today }).catch(() => null),
      this.plannerService.getDay(userId, today).catch(() => null),
      this.learnService.getProfile(userId).catch(() => null),
    ]);

    const todayRemaining = day ? day.tasks.filter((task) => task.status === 'todo').length : 0;

    return {
      currency: overview?.currency ?? 'BDT',
      bills:
        overview?.upcomingBills.map((bill) => ({
          id: bill.id,
          name: bill.name,
          amountMinor: bill.amountMinor,
          dueInDays: bill.dueInDays,
        })) ?? [],
      remainingMinor: overview?.isConfigured ? overview.totals.remainingMinor : null,
      overdueTaskCount: day?.overdue.length ?? 0,
      todayRemainingTaskCount: todayRemaining,
      examDate: learner?.profile.examDate ?? null,
    };
  }

  async getNotifications(userId: string, hour: number | null): Promise<NotificationsResponse> {
    const today = isoToday();
    const rawPrefs = await this.repository.getPreferences(userId).catch(() => ({}));
    const preferences = this.resolvePreferences(rawPrefs);

    let signals: NotificationSignals;
    try {
      signals = await this.gatherSignals(userId, today);
    } catch (error) {
      this.logger.warn(
        `Notification signals unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      signals = {
        currency: 'BDT',
        bills: [],
        remainingMinor: null,
        overdueTaskCount: 0,
        todayRemainingTaskCount: 0,
        examDate: null,
      };
    }

    return {
      notifications: buildNotifications(signals, preferences, today),
      quietHoursActive: quietHoursActive(preferences, hour),
    };
  }
}
