import { Module } from '@nestjs/common';
import { BalanceController } from './balance.controller';
import { BalanceRepository } from './balance.repository';
import { BalanceService } from './balance.service';

@Module({
  controllers: [BalanceController],
  providers: [BalanceService, BalanceRepository],
})
export class BalanceModule {}
