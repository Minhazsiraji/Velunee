import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateHomeCardsInput } from '@velunee/contracts';

import { getCurrentCoordinates } from '@/lib/location';
import { todayIso } from '@/features/balance/format';

import { loadHomeOverview, updateHomeCards } from './api';

const homeKey = ['home'] as const;

export function useHomeOverview() {
  return useQuery({
    queryKey: [...homeKey, 'overview'],
    queryFn: async () => {
      const coordinates = await getCurrentCoordinates();
      return loadHomeOverview({
        today: todayIso(),
        hour: new Date().getHours(),
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
      });
    },
    staleTime: 60_000,
  });
}

export function useUpdateHomeCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHomeCardsInput) => updateHomeCards(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: homeKey });
    },
  });
}
