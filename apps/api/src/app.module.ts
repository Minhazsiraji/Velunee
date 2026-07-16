import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { parseApiEnvironment } from '@velunee/validation';
import { AccountModule } from './account/account.module';
import { AuthModule } from './auth/auth.module';
import { BalanceModule } from './balance/balance.module';
import { AppAuthGuard } from './common/guards/app-auth.guard';
import { ChatModule } from './chat/chat.module';
import { CommunityModule } from './community/community.module';
import { DatabaseModule } from './database/database.module';
import { DecideModule } from './decide/decide.module';
import { CryptoModule } from './crypto/crypto.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { LearnModule } from './learn/learn.module';
import { MemoryModule } from './memory/memory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlannerModule } from './planner/planner.module';
import { StyleModule } from './style/style.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: parseApiEnvironment,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    DatabaseModule,
    CryptoModule,
    HealthModule,
    SystemModule,
    ChatModule,
    AccountModule,
    CommunityModule,
    BalanceModule,
    HomeModule,
    MemoryModule,
    DecideModule,
    StyleModule,
    LearnModule,
    PlannerModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AppAuthGuard },
  ],
})
export class AppModule {}
