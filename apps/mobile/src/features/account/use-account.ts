import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AccountOverviewResponse,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from '@velunee/contracts';

import { loadAccountOverview, updatePreferences, updateProfile } from './api';

export const accountQueryKey = ['account', 'overview'] as const;

export function useAccountOverview() {
  return useQuery({
    queryKey: accountQueryKey,
    queryFn: loadAccountOverview,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (data: AccountOverviewResponse) => {
      queryClient.setQueryData(accountQueryKey, data);
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePreferencesInput) => updatePreferences(input),
    onMutate: async (input: UpdatePreferencesInput) => {
      await queryClient.cancelQueries({ queryKey: accountQueryKey });
      const previous = queryClient.getQueryData<AccountOverviewResponse>(accountQueryKey);

      if (previous) {
        queryClient.setQueryData<AccountOverviewResponse>(accountQueryKey, {
          ...previous,
          preferences: { ...previous.preferences, ...input },
        });
      }

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(accountQueryKey, context.previous);
      }
    },
    onSuccess: (data: AccountOverviewResponse) => {
      queryClient.setQueryData(accountQueryKey, data);
    },
  });
}
