import { Module } from '@nestjs/common';
import { BalanceModule } from '../balance/balance.module';
import { WeatherModule } from '../weather/weather.module';
import { HomeController } from './home.controller';
import { HomeRepository } from './home.repository';
import { HomeService } from './home.service';

@Module({
  imports: [WeatherModule, BalanceModule],
  controllers: [HomeController],
  providers: [HomeService, HomeRepository],
})
export class HomeModule {}
