import {
  notificationPreferencesResponseSchema,
  notificationsResponseSchema,
  type NotificationPreferencesResponse,
  type NotificationsResponse,
  type UpdateNotificationPreferencesInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadNotifications(): Promise<NotificationsResponse> {
  const hour = new Date().getHours();
  const payload = await apiRequest<unknown>(`/notifications?hour=${hour}`);
  return notificationsResponseSchema.parse(payload);
}

export async function loadNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  const payload = await apiRequest<unknown>('/notifications/preferences');
  return notificationPreferencesResponseSchema.parse(payload);
}

export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
): Promise<NotificationPreferencesResponse> {
  const payload = await apiRequest<unknown>('/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return notificationPreferencesResponseSchema.parse(payload);
}
