import { Module } from '@nestjs/common';
import { BalanceModule } from '../balance/balance.module';
import { LearnModule } from '../learn/learn.module';
import { PlannerModule } from '../planner/planner.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [BalanceModule, PlannerModule, LearnModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
