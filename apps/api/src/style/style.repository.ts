import { Inject, Injectable } from '@nestjs/common';
import type {
  GarmentFormality,
  GarmentWarmth,
  StyleOccasion,
  WardrobeCategory,
} from '@velunee/contracts';
import { outfits, users, wardrobeItems, type DatabaseConnection } from '@velunee/database';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.constants';

export interface WardrobeItemRow {
  id: string;
  name: string;
  category: WardrobeCategory;
  color: string;
  warmth: GarmentWarmth;
  formality: GarmentFormality;
  notes: string | null;
  timesWorn: number;
  lastWornOn: string | null;
  createdAt: Date;
}

export interface OutfitRow {
  id: string;
  name: string;
  itemIds: string[];
  occasion: StyleOccasion;
  isFavorite: boolean;
  createdAt: Date;
}

const NOT_CONFIGURED = 'Style persistence is not configured';

@Injectable()
export class StyleRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly connection: DatabaseConnection | null,
  ) {}

  get enabled(): boolean {
    return this.connection !== null;
  }

  private async ensureUser(userId: string): Promise<void> {
    if (!this.connection) return;
    await this.connection.db
      .insert(users)
      .values({ id: userId, authProviderId: userId })
      .onConflictDoNothing();
  }

  private mapItem(row: {
    id: string;
    name: string;
    category: string;
    color: string;
    warmth: string;
    formality: string;
    notes: string | null;
    timesWorn: number;
    lastWornOn: string | null;
    createdAt: Date;
  }): WardrobeItemRow {
    return {
      id: row.id,
      name: row.name,
      category: row.category as WardrobeCategory,
      color: row.color,
      warmth: row.warmth as GarmentWarmth,
      formality: row.formality as GarmentFormality,
      notes: row.notes,
      timesWorn: row.timesWorn,
      lastWornOn: row.lastWornOn,
      createdAt: row.createdAt,
    };
  }

  async listItems(userId: string): Promise<WardrobeItemRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select()
      .from(wardrobeItems)
      .where(and(eq(wardrobeItems.userId, userId), isNull(wardrobeItems.deletedAt)))
      .orderBy(desc(wardrobeItems.createdAt));
    return rows.map((row) => this.mapItem(row));
  }

  async createItem(
    userId: string,
    input: {
      name: string;
      category: WardrobeCategory;
      color: string;
      warmth: GarmentWarmth;
      formality: GarmentFormality;
      notes: string | null;
    },
  ): Promise<WardrobeItemRow> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    await this.ensureUser(userId);
    const [row] = await this.connection.db
      .insert(wardrobeItems)
      .values({ userId, ...input })
      .returning();
    if (!row) throw new Error('Wardrobe item could not be saved');
    return this.mapItem(row);
  }

  async updateItem(
    userId: string,
    itemId: string,
    patch: Partial<{
      name: string;
      category: WardrobeCategory;
      color: string;
      warmth: GarmentWarmth;
      formality: GarmentFormality;
      notes: string | null;
    }>,
  ): Promise<WardrobeItemRow | null> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const [row] = await this.connection.db
      .update(wardrobeItems)
      .set(patch)
      .where(
        and(
          eq(wardrobeItems.id, itemId),
          eq(wardrobeItems.userId, userId),
          isNull(wardrobeItems.deletedAt),
        ),
      )
      .returning();
    return row ? this.mapItem(row) : null;
  }

  async markWorn(userId: string, itemId: string, dateIso: string): Promise<WardrobeItemRow | null> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const [existing] = await this.connection.db
      .select({ timesWorn: wardrobeItems.timesWorn })
      .from(wardrobeItems)
      .where(
        and(
          eq(wardrobeItems.id, itemId),
          eq(wardrobeItems.userId, userId),
          isNull(wardrobeItems.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return null;

    const [row] = await this.connection.db
      .update(wardrobeItems)
      .set({ timesWorn: existing.timesWorn + 1, lastWornOn: dateIso })
      .where(eq(wardrobeItems.id, itemId))
      .returning();
    return row ? this.mapItem(row) : null;
  }

  async softDeleteItem(userId: string, itemId: string): Promise<boolean> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const updated = await this.connection.db
      .update(wardrobeItems)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(wardrobeItems.id, itemId),
          eq(wardrobeItems.userId, userId),
          isNull(wardrobeItems.deletedAt),
        ),
      )
      .returning({ id: wardrobeItems.id });
    return updated.length > 0;
  }

  async listOutfits(userId: string): Promise<OutfitRow[]> {
    if (!this.connection) return [];
    const rows = await this.connection.db
      .select({
        id: outfits.id,
        name: outfits.name,
        itemIds: outfits.itemIds,
        occasion: outfits.occasion,
        isFavorite: outfits.isFavorite,
        createdAt: outfits.createdAt,
      })
      .from(outfits)
      .where(and(eq(outfits.userId, userId), isNull(outfits.deletedAt)))
      .orderBy(desc(outfits.isFavorite), desc(outfits.createdAt));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      itemIds: row.itemIds,
      occasion: row.occasion as StyleOccasion,
      isFavorite: row.isFavorite,
      createdAt: row.createdAt,
    }));
  }

  async createOutfit(
    userId: string,
    input: { name: string; itemIds: string[]; occasion: StyleOccasion },
  ): Promise<OutfitRow> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    await this.ensureUser(userId);
    const [row] = await this.connection.db
      .insert(outfits)
      .values({ userId, name: input.name, itemIds: input.itemIds, occasion: input.occasion })
      .returning({
        id: outfits.id,
        name: outfits.name,
        itemIds: outfits.itemIds,
        occasion: outfits.occasion,
        isFavorite: outfits.isFavorite,
        createdAt: outfits.createdAt,
      });
    if (!row) throw new Error('Outfit could not be saved');
    return {
      id: row.id,
      name: row.name,
      itemIds: row.itemIds,
      occasion: row.occasion as StyleOccasion,
      isFavorite: row.isFavorite,
      createdAt: row.createdAt,
    };
  }

  async setFavorite(
    userId: string,
    outfitId: string,
    isFavorite: boolean,
  ): Promise<OutfitRow | null> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const [row] = await this.connection.db
      .update(outfits)
      .set({ isFavorite })
      .where(and(eq(outfits.id, outfitId), eq(outfits.userId, userId), isNull(outfits.deletedAt)))
      .returning({
        id: outfits.id,
        name: outfits.name,
        itemIds: outfits.itemIds,
        occasion: outfits.occasion,
        isFavorite: outfits.isFavorite,
        createdAt: outfits.createdAt,
      });
    return row
      ? {
          id: row.id,
          name: row.name,
          itemIds: row.itemIds,
          occasion: row.occasion as StyleOccasion,
          isFavorite: row.isFavorite,
          createdAt: row.createdAt,
        }
      : null;
  }

  async softDeleteOutfit(userId: string, outfitId: string): Promise<boolean> {
    if (!this.connection) throw new Error(NOT_CONFIGURED);
    const updated = await this.connection.db
      .update(outfits)
      .set({ deletedAt: new Date() })
      .where(and(eq(outfits.id, outfitId), eq(outfits.userId, userId), isNull(outfits.deletedAt)))
      .returning({ id: outfits.id });
    return updated.length > 0;
  }
}
