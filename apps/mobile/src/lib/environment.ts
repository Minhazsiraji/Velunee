const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const configuredTimeout = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);

const apiTimeoutMs =
  Number.isFinite(configuredTimeout) && configuredTimeout >= 5_000 ? configuredTimeout : 45_000;

export const environment = {
  apiUrl: (configuredApiUrl || 'http://localhost:4000/api/v1').replace(/\/$/, ''),

  apiTimeoutMs,

  allowDevelopmentUserFallback: process.env.EXPO_PUBLIC_ALLOW_DEV_USER_FALLBACK === 'true',

  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '',

  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
} as const;

export const DEVELOPMENT_USER_ID = '00000000-0000-4000-8000-000000000001';
