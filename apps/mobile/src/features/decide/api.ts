import { decideResponseSchema, type DecideResponse } from '@velunee/contracts';

import { apiRequest } from '@/lib/api';
import { getCurrentCoordinates } from '@/lib/location';
import { todayIso } from '@/features/balance/format';

export async function askDecide(question: string): Promise<DecideResponse> {
  const coordinates = await getCurrentCoordinates();
  const payload = await apiRequest<unknown>('/decide', {
    method: 'POST',
    body: JSON.stringify({
      question,
      today: todayIso(),
      ...(coordinates
        ? { location: { latitude: coordinates.latitude, longitude: coordinates.longitude } }
        : {}),
    }),
  });
  return decideResponseSchema.parse(payload);
}
