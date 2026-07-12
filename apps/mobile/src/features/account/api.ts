import {
  accountOverviewResponseSchema,
  deleteAccountResponseSchema,
  type AccountOverviewResponse,
  type UpdatePreferencesInput,
  type UpdateProfileInput,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadAccountOverview(): Promise<AccountOverviewResponse> {
  const payload = await apiRequest<unknown>('/account');
  return accountOverviewResponseSchema.parse(payload);
}

export async function updateProfile(input: UpdateProfileInput): Promise<AccountOverviewResponse> {
  const payload = await apiRequest<unknown>('/account/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return accountOverviewResponseSchema.parse(payload);
}

export async function updatePreferences(
  input: UpdatePreferencesInput,
): Promise<AccountOverviewResponse> {
  const payload = await apiRequest<unknown>('/account/preferences', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return accountOverviewResponseSchema.parse(payload);
}

export async function deleteAccount(): Promise<void> {
  const payload = await apiRequest<unknown>('/account', {
    method: 'DELETE',
  });
  deleteAccountResponseSchema.parse(payload);
}
