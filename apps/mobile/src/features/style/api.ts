import {
  savedOutfitResponseSchema,
  savedOutfitsResponseSchema,
  styleDeletedResponseSchema,
  suggestOutfitResponseSchema,
  wardrobeItemResponseSchema,
  wardrobeItemsResponseSchema,
  type CreateWardrobeItemInput,
  type SaveOutfitInput,
  type SavedOutfitResponse,
  type SavedOutfitsResponse,
  type StyleDeletedResponse,
  type SuggestOutfitRequestInput,
  type SuggestOutfitResponse,
  type UpdateWardrobeItemInput,
  type WardrobeItemResponse,
  type WardrobeItemsResponse,
} from '@velunee/contracts';

import { apiRequest } from '@/lib/api';

export async function loadWardrobe(): Promise<WardrobeItemsResponse> {
  const payload = await apiRequest<unknown>('/style/wardrobe');
  return wardrobeItemsResponseSchema.parse(payload);
}

export async function createWardrobeItem(
  input: CreateWardrobeItemInput,
): Promise<WardrobeItemResponse> {
  const payload = await apiRequest<unknown>('/style/wardrobe', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return wardrobeItemResponseSchema.parse(payload);
}

export async function updateWardrobeItem(
  itemId: string,
  input: UpdateWardrobeItemInput,
): Promise<WardrobeItemResponse> {
  const payload = await apiRequest<unknown>(`/style/wardrobe/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return wardrobeItemResponseSchema.parse(payload);
}

export async function markItemWorn(itemId: string): Promise<WardrobeItemResponse> {
  const payload = await apiRequest<unknown>(`/style/wardrobe/${itemId}/worn`, { method: 'POST' });
  return wardrobeItemResponseSchema.parse(payload);
}

export async function deleteWardrobeItem(itemId: string): Promise<StyleDeletedResponse> {
  const payload = await apiRequest<unknown>(`/style/wardrobe/${itemId}`, { method: 'DELETE' });
  return styleDeletedResponseSchema.parse(payload);
}

export async function suggestOutfit(
  input: SuggestOutfitRequestInput,
): Promise<SuggestOutfitResponse> {
  const payload = await apiRequest<unknown>('/style/suggest', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return suggestOutfitResponseSchema.parse(payload);
}

export async function loadOutfits(): Promise<SavedOutfitsResponse> {
  const payload = await apiRequest<unknown>('/style/outfits');
  return savedOutfitsResponseSchema.parse(payload);
}

export async function saveOutfit(input: SaveOutfitInput): Promise<SavedOutfitResponse> {
  const payload = await apiRequest<unknown>('/style/outfits', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return savedOutfitResponseSchema.parse(payload);
}

export async function deleteOutfit(outfitId: string): Promise<StyleDeletedResponse> {
  const payload = await apiRequest<unknown>(`/style/outfits/${outfitId}`, { method: 'DELETE' });
  return styleDeletedResponseSchema.parse(payload);
}
