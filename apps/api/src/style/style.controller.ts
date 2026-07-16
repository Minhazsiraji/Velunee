import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  createWardrobeItemSchema,
  saveOutfitSchema,
  suggestOutfitRequestSchema,
  updateWardrobeItemSchema,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { StyleService } from './style.service';

@Controller('style')
export class StyleController {
  constructor(private readonly styleService: StyleService) {}

  @Get('wardrobe')
  async listItems(@CurrentUser() user: AuthenticatedUser): Promise<WardrobeItemsResponse> {
    return this.styleService.listItems(user.id);
  }

  @Post('wardrobe')
  async createItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWardrobeItemSchema))
    input: CreateWardrobeItemInput,
  ): Promise<WardrobeItemResponse> {
    return this.styleService.createItem(user.id, input);
  }

  @Patch('wardrobe/:itemId')
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateWardrobeItemSchema))
    input: UpdateWardrobeItemInput,
  ): Promise<WardrobeItemResponse> {
    return this.styleService.updateItem(user.id, itemId, input);
  }

  @Post('wardrobe/:itemId/worn')
  async markWorn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ): Promise<WardrobeItemResponse> {
    return this.styleService.markWorn(user.id, itemId);
  }

  @Delete('wardrobe/:itemId')
  async deleteItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ): Promise<StyleDeletedResponse> {
    return this.styleService.deleteItem(user.id, itemId);
  }

  @Post('suggest')
  async suggest(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(suggestOutfitRequestSchema))
    input: SuggestOutfitRequestInput,
  ): Promise<SuggestOutfitResponse> {
    return this.styleService.suggest(user.id, input);
  }

  @Get('outfits')
  async listOutfits(@CurrentUser() user: AuthenticatedUser): Promise<SavedOutfitsResponse> {
    return this.styleService.listOutfits(user.id);
  }

  @Post('outfits')
  async saveOutfit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(saveOutfitSchema))
    input: SaveOutfitInput,
  ): Promise<SavedOutfitResponse> {
    return this.styleService.saveOutfit(user.id, input);
  }

  @Patch('outfits/:outfitId/favorite')
  async setFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('outfitId') outfitId: string,
    @Query('value') value?: string,
  ): Promise<SavedOutfitResponse> {
    return this.styleService.setFavorite(user.id, outfitId, value !== 'false');
  }

  @Delete('outfits/:outfitId')
  async deleteOutfit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('outfitId') outfitId: string,
  ): Promise<StyleDeletedResponse> {
    return this.styleService.deleteOutfit(user.id, outfitId);
  }
}
