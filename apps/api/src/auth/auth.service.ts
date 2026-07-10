import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser, AuthProvider } from '@velunee/auth-core';
import { AUTH_PROVIDER } from './auth.constants';

const DEVELOPMENT_USER_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider | null,
  ) {}

  async authenticate(authorization?: string, developmentUserId?: string): Promise<AuthenticatedUser> {
    const mode = this.config.get<'development' | 'required'>('AUTH_MODE') ?? 'development';
    const token = this.extractBearerToken(authorization);

    if (token) {
      if (!this.provider) {
        throw new UnauthorizedException('Authentication provider is not configured');
      }
      try {
        return await this.provider.verifyAccessToken(token);
      } catch {
        throw new UnauthorizedException('Invalid or expired access token');
      }
    }

    if (mode === 'required') {
      throw new UnauthorizedException('Bearer access token is required');
    }

    const id = developmentUserId?.trim() || DEVELOPMENT_USER_ID;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      throw new UnauthorizedException('x-dev-user-id must be a valid UUID');
    }

    return {
      id,
      role: 'development',
      claims: { sub: id, role: 'development' },
    };
  }

  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization) return undefined;
    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Authorization header must use the Bearer scheme');
    }
    return token;
  }
}
