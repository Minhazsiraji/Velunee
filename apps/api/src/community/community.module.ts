import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityRepository } from './community.repository';
import { CommunityService } from './community.service';

@Module({
  controllers: [CommunityController],
  providers: [CommunityRepository, CommunityService],
})
export class CommunityModule {}
