import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthProvider, type AuthProvider } from '@velunee/auth-core';
import { AUTH_PROVIDER } from './auth.constants';
import { AuthService } from './auth.service';

@Module({
  providers: [
    {
      provide: AUTH_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AuthProvider | null => {
        const supabaseUrl = config.get<string>('SUPABASE_URL');
        if (!supabaseUrl) return null;
        return new SupabaseAuthProvider({
          supabaseUrl,
          audience: config.get<string>('SUPABASE_JWT_AUDIENCE') ?? 'authenticated',
        });
      },
    },
    AuthService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
