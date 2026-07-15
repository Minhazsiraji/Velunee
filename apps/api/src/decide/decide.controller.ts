import { Body, Controller, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '@velunee/auth-core';
import {
  decideRequestSchema,
  type DecideRequestInput,
  type DecideResponse,
} from '@velunee/contracts';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DecideService } from './decide.service';

@Controller('decide')
export class DecideController {
  constructor(private readonly decideService: DecideService) {}

  @Post()
  async decide(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(decideRequestSchema))
    input: DecideRequestInput,
  ): Promise<DecideResponse> {
    return this.decideService.decide(user.id, input);
  }
}
