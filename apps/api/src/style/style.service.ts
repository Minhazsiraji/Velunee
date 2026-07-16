import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateWardrobeItemInput,
  OutfitPiece,
  SaveOutfitInput,
  SavedOutfit,
  SavedOutfitResponse,
  SavedOutfitsResponse,
  StyleDeletedResponse,
  SuggestOutfitRequestInput,
  SuggestOutfitResponse,
  UpdateWardrobeItemInput,
  WardrobeItem,
  WardrobeItemResponse,
  WardrobeItemsResponse,
} from '@velunee/contracts';
import { suggestOutfit, type StyleItem } from './style.logic';
import { StyleRepository, type OutfitRow, type WardrobeItemRow } from './style.repository';

const MAX_ITEMS = 300;

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class StyleService {
  constructor(private readonly repository: StyleRepository) {}

  private toItemContract(row: WardrobeItemRow): WardrobeItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      color: row.color,
      warmth: row.warmth,
      formality: row.formality,
      notes: row.notes,
      timesWorn: row.timesWorn,
      lastWornOn: row.lastWornOn,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toStyleItem(row: WardrobeItemRow): StyleItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      color: row.color,
      warmth: row.warmth,
      formality: row.formality,
      timesWorn: row.timesWorn,
    };
  }

  async listItems(userId: string): Promise<WardrobeItemsResponse> {
    const rows = await this.repository.listItems(userId);
    return { items: rows.map((row) => this.toItemContract(row)) };
  }

  async createItem(userId: string, input: CreateWardrobeItemInput): Promise<WardrobeItemResponse> {
    const existing = await this.repository.listItems(userId);
    if (existing.length >= MAX_ITEMS) {
      throw new BadRequestException(
        `Your wardrobe is at the ${MAX_ITEMS}-item limit. Remove something you no longer wear first.`,
      );
    }
    const row = await this.repository.createItem(userId, {
      name: input.name,
      category: input.category,
      color: input.color ?? 'neutral',
      warmth: input.warmth ?? 'medium',
      formality: input.formality ?? 'casual',
      notes: input.notes?.length ? input.notes : null,
    });
    return { item: this.toItemContract(row) };
  }

  async updateItem(
    userId: string,
    itemId: string,
    input: UpdateWardrobeItemInput,
  ): Promise<WardrobeItemResponse> {
    const row = await this.repository.updateItem(userId, itemId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.warmth !== undefined ? { warmth: input.warmth } : {}),
      ...(input.formality !== undefined ? { formality: input.formality } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.length ? input.notes : null } : {}),
    });
    if (!row) throw new NotFoundException('Wardrobe item not found');
    return { item: this.toItemContract(row) };
  }

  async markWorn(userId: string, itemId: string): Promise<WardrobeItemResponse> {
    const row = await this.repository.markWorn(userId, itemId, isoToday());
    if (!row) throw new NotFoundException('Wardrobe item not found');
    return { item: this.toItemContract(row) };
  }

  async deleteItem(userId: string, itemId: string): Promise<StyleDeletedResponse> {
    const deleted = await this.repository.softDeleteItem(userId, itemId);
    if (!deleted) throw new NotFoundException('Wardrobe item not found');
    return { deleted: true };
  }

  async suggest(userId: string, input: SuggestOutfitRequestInput): Promise<SuggestOutfitResponse> {
    const rows = await this.repository.listItems(userId);
    return suggestOutfit({
      items: rows.map((row) => this.toStyleItem(row)),
      occasion: input.occasion,
      temperatureC: input.temperatureC,
      rain: input.rain,
    });
  }

  private resolvePieces(row: OutfitRow, itemsById: Map<string, WardrobeItemRow>): OutfitPiece[] {
    return row.itemIds
      .map((id) => itemsById.get(id))
      .filter((item): item is WardrobeItemRow => item !== undefined)
      .map((item) => ({
        itemId: item.id,
        name: item.name,
        category: item.category,
        color: item.color,
      }));
  }

  private toOutfitContract(row: OutfitRow, itemsById: Map<string, WardrobeItemRow>): SavedOutfit {
    return {
      id: row.id,
      name: row.name,
      occasion: row.occasion,
      isFavorite: row.isFavorite,
      pieces: this.resolvePieces(row, itemsById),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async itemsById(userId: string): Promise<Map<string, WardrobeItemRow>> {
    const items = await this.repository.listItems(userId);
    return new Map(items.map((item) => [item.id, item]));
  }

  async listOutfits(userId: string): Promise<SavedOutfitsResponse> {
    const [rows, itemsById] = await Promise.all([
      this.repository.listOutfits(userId),
      this.itemsById(userId),
    ]);
    return { outfits: rows.map((row) => this.toOutfitContract(row, itemsById)) };
  }

  async saveOutfit(userId: string, input: SaveOutfitInput): Promise<SavedOutfitResponse> {
    const itemsById = await this.itemsById(userId);
    const validIds = input.itemIds.filter((id) => itemsById.has(id));
    if (validIds.length === 0) {
      throw new BadRequestException('None of those items are in your wardrobe.');
    }
    const row = await this.repository.createOutfit(userId, {
      name: input.name,
      itemIds: validIds,
      occasion: input.occasion,
    });
    return { outfit: this.toOutfitContract(row, itemsById) };
  }

  async setFavorite(
    userId: string,
    outfitId: string,
    isFavorite: boolean,
  ): Promise<SavedOutfitResponse> {
    const row = await this.repository.setFavorite(userId, outfitId, isFavorite);
    if (!row) throw new NotFoundException('Outfit not found');
    const itemsById = await this.itemsById(userId);
    return { outfit: this.toOutfitContract(row, itemsById) };
  }

  async deleteOutfit(userId: string, outfitId: string): Promise<StyleDeletedResponse> {
    const deleted = await this.repository.softDeleteOutfit(userId, outfitId);
    if (!deleted) throw new NotFoundException('Outfit not found');
    return { deleted: true };
  }
}
