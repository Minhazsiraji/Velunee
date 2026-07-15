import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  updateHomeCardsSchema,
  type HomeCardsResponse,
  type HomeOverviewResponse,
  type UpdateHomeCardsInput,
} from '@velunee/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('overview')
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('today') today?: string,
    @Query('hour') hour?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<HomeOverviewResponse> {
    return this.homeService.getOverview(user.id, { today, hour, latitude, longitude });
  }

  @Get('cards')
  async getCards(@CurrentUser() user: AuthenticatedUser): Promise<HomeCardsResponse> {
    return this.homeService.getCards(user.id);
  }

  @Put('cards')
  async updateCards(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateHomeCardsSchema))
    input: UpdateHomeCardsInput,
  ): Promise<HomeCardsResponse> {
    return this.homeService.updateCards(user.id, input);
  }
}
