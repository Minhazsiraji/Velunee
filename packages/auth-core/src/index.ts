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

/**
 * Optional admin capability. Only available when a Supabase
 * service-role key is configured on the server. Never expose the
 * service-role key to clients.
 */
export interface AuthAdmin {
  /** Permanently delete the auth user from the identity provider. */
  deleteAuthUser(userId: string): Promise<void>;
}

export function supportsAdmin(
  provider: AuthProvider | AuthAdmin | null | undefined,
): provider is AuthProvider & AuthAdmin {
  return (
    provider !== null &&
    provider !== undefined &&
    typeof (provider as AuthAdmin).deleteAuthUser === 'function'
  );
}

export interface SupabaseAuthProviderOptions {
  supabaseUrl: string;
  audience?: string;
  /** Server-only service-role key that unlocks admin operations. */
  serviceRoleKey?: string;
}

export class SupabaseAuthProvider implements AuthProvider, AuthAdmin {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly serviceRoleKey?: string;

  constructor(options: SupabaseAuthProviderOptions) {
    const baseUrl = options.supabaseUrl.replace(/\/$/, '');
    this.issuer = `${baseUrl}/auth/v1`;
    this.audience = options.audience ?? 'authenticated';
    this.serviceRoleKey = options.serviceRoleKey;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  async deleteAuthUser(userId: string): Promise<void> {
    if (!this.serviceRoleKey) {
      throw new Error(
        'Supabase service-role key is not configured; cannot delete auth users',
      );
    }

    const response = await fetch(
      `${this.issuer}/admin/users/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
        },
      },
    );

    // Treat an already-removed user as success so deletion is idempotent.
    if (!response.ok && response.status !== 404) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Failed to delete auth user (${response.status}): ${detail}`,
      );
    }
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
