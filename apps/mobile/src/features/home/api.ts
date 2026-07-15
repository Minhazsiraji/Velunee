import {
  homeCardsResponseSchema,
  homeOverviewResponseSchema,
  type HomeCardsResponse,
  type HomeOverviewResponse,
  type UpdateHomeCardsInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export interface HomeOverviewParams {
  today: string;
  hour: number;
  latitude?: number;
  longitude?: number;
}

export async function loadHomeOverview(params: HomeOverviewParams): Promise<HomeOverviewResponse> {
  const query = new URLSearchParams({
    today: params.today,
    hour: String(params.hour),
  });
  if (params.latitude !== undefined && params.longitude !== undefined) {
    query.set('latitude', String(params.latitude));
    query.set('longitude', String(params.longitude));
  }

  const payload = await apiRequest<unknown>(`/home/overview?${query.toString()}`);
  return homeOverviewResponseSchema.parse(payload);
}

export async function updateHomeCards(input: UpdateHomeCardsInput): Promise<HomeCardsResponse> {
  const payload = await apiRequest<unknown>('/home/cards', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return homeCardsResponseSchema.parse(payload);
}
