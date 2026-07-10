import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: string;
  claims: JWTPayload;
}

export interface AuthProvider {
  verifyAccessToken(token: string): Promise<AuthenticatedUser>;
}

export interface SupabaseAuthProviderOptions {
  supabaseUrl: string;
  audience?: string;
}

export class SupabaseAuthProvider implements AuthProvider {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(options: SupabaseAuthProviderOptions) {
    const baseUrl = options.supabaseUrl.replace(/\/$/, '');
    this.issuer = `${baseUrl}/auth/v1`;
    this.audience = options.audience ?? 'authenticated';
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience,
    });

    if (!payload.sub) {
      throw new Error('Authentication token does not contain a subject');
    }

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const role = typeof payload.role === 'string' ? payload.role : 'authenticated';

    return {
      id: payload.sub,
      ...(email ? { email } : {}),
      role,
      claims: payload,
    };
  }
}
