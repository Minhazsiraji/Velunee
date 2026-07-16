import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateWardrobeItemInput,
  SaveOutfitInput,
  SuggestOutfitRequestInput,
} from '@velunee/contracts';

import {
  createWardrobeItem,
  deleteOutfit,
  deleteWardrobeItem,
  loadOutfits,
  loadWardrobe,
  markItemWorn,
  saveOutfit,
  suggestOutfit,
} from './api';

const styleKey = ['style'] as const;

function useInvalidateStyle(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: styleKey });
  };
}

export function useWardrobe() {
  return useQuery({
    queryKey: [...styleKey, 'wardrobe'],
    queryFn: () => loadWardrobe(),
  });
}

export function useCreateWardrobeItem() {
  const invalidate = useInvalidateStyle();
  return useMutation({
    mutationFn: (input: CreateWardrobeItemInput) => createWardrobeItem(input),
    onSuccess: invalidate,
  });
}

export function useMarkItemWorn() {
  const invalidate = useInvalidateStyle();
  return useMutation({
    mutationFn: (itemId: string) => markItemWorn(itemId),
    onSuccess: invalidate,
  });
}

export function useDeleteWardrobeItem() {
  const invalidate = useInvalidateStyle();
  return useMutation({
    mutationFn: (itemId: string) => deleteWardrobeItem(itemId),
    onSuccess: invalidate,
  });
}

export function useSuggestOutfit() {
  return useMutation({
    mutationFn: (input: SuggestOutfitRequestInput) => suggestOutfit(input),
  });
}

export function useOutfits() {
  return useQuery({
    queryKey: [...styleKey, 'outfits'],
    queryFn: () => loadOutfits(),
  });
}

export function useSaveOutfit() {
  const invalidate = useInvalidateStyle();
  return useMutation({
    mutationFn: (input: SaveOutfitInput) => saveOutfit(input),
    onSuccess: invalidate,
  });
}

export function useDeleteOutfit() {
  const invalidate = useInvalidateStyle();
  return useMutation({
    mutationFn: (outfitId: string) => deleteOutfit(outfitId),
    onSuccess: invalidate,
  });
}
