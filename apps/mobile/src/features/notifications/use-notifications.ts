import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateNotificationPreferencesInput } from '@velunee/contracts';

import {
  loadNotificationPreferences,
  loadNotifications,
  updateNotificationPreferences,
} from './api';

const notificationsKey = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: [...notificationsKey, 'list'],
    queryFn: () => loadNotifications(),
    staleTime: 60_000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...notificationsKey, 'preferences'],
    queryFn: () => loadNotificationPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) => updateNotificationPreferences(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}
