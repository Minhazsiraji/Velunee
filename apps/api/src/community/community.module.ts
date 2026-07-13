import { Module } from '@nestjs/common';
import { HeuristicModerationProvider } from '@velunee/moderation-core';
import { MODERATION_PROVIDER } from './community.constants';
import { CommunityController } from './community.controller';
import { CommunityRepository } from './community.repository';
import { CommunityService } from './community.service';

@Module({
  controllers: [CommunityController],
  providers: [
    CommunityRepository,
    CommunityService,
    { provide: MODERATION_PROVIDER, useClass: HeuristicModerationProvider },
  ],
})
export class CommunityModule {}
