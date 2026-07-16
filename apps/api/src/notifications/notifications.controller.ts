import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  updateNotificationPreferencesSchema,
  type NotificationPreferencesResponse,
  type NotificationsResponse,
  type UpdateNotificationPreferencesInput,
} from '@velunee/contracts';
import { z } from 'zod';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { NotificationsService } from './notifications.service';

const hourSchema = z.coerce.number().int().min(0).max(23);

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('hour') hour?: string,
  ): Promise<NotificationsResponse> {
    const parsed = hourSchema.safeParse(hour);
    return this.notificationsService.getNotifications(user.id, parsed.success ? parsed.data : null);
  }

  @Get('preferences')
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferencesResponse> {
    return this.notificationsService.getPreferences(user.id);
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateNotificationPreferencesSchema))
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferencesResponse> {
    return this.notificationsService.updatePreferences(user.id, input);
  }
}
