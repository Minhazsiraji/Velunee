import { Module } from '@nestjs/common';
import { PlannerController } from './planner.controller';
import { PlannerRepository } from './planner.repository';
import { PlannerService } from './planner.service';

@Module({
  controllers: [PlannerController],
  providers: [PlannerService, PlannerRepository],
  exports: [PlannerService],
})
export class PlannerModule {}
