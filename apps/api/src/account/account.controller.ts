import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
} from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  updatePreferencesSchema,
  updateProfileSchema,
  type AccountOverviewResponse,
  type DeleteAccountResponse,
  type UpdatePreferencesInput,
  type UpdateProfileInput,
} from '@velunee/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AccountService } from './account.service';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccountOverviewResponse> {
    return this.accountService.getOverview(user);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema))
    input: UpdateProfileInput,
  ): Promise<AccountOverviewResponse> {
    await this.accountService.updateProfile(user.id, input);
    return this.accountService.getOverview(user);
  }

  @Patch('preferences')
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updatePreferencesSchema))
    input: UpdatePreferencesInput,
  ): Promise<AccountOverviewResponse> {
    await this.accountService.updatePreferences(user.id, input);
    return this.accountService.getOverview(user);
  }

  @Delete()
  @HttpCode(200)
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeleteAccountResponse> {
    await this.accountService.deleteAccount(user.id);
    return { deleted: true };
  }
}
