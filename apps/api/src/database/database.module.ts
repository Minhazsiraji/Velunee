import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabase, type DatabaseConnection } from '@velunee/database';
import { DATABASE_CONNECTION } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DatabaseConnection | null => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        return databaseUrl ? createDatabase(databaseUrl) : null;
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
