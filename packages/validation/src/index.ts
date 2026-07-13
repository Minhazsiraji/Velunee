import { z } from 'zod';

const optionalUrl = z.string().url().optional().or(z.literal(''));

export const apiEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: z.string().default('*'),
    AUTH_MODE: z.enum(['development', 'required']).default('development'),
    // Comma-separated user IDs allowed to use community moderation endpoints.
    ADMIN_USER_IDS: z.string().default(''),
    SUPABASE_URL: optionalUrl,
    SUPABASE_JWT_AUDIENCE: z.string().default('authenticated'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    DATABASE_URL: optionalUrl,
    FIELD_ENCRYPTION_KEY: z.string().optional(),
    REDIS_URL: optionalUrl,
    GEMINI_API_KEY: z.string().optional(),
    // WeatherAPI.com key. When set, chats that include the user's location get
    // live weather context so Velunee can give practical, weather-aware advice.
    WEATHER_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),
    AI_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  })
  .superRefine((environment, context) => {
    if (environment.AUTH_MODE === 'required' && !environment.SUPABASE_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_URL'],
        message: 'SUPABASE_URL is required when AUTH_MODE=required',
      });
    }

    if (environment.AI_PROVIDER === 'gemini' && !environment.GEMINI_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GEMINI_API_KEY'],
        message: 'GEMINI_API_KEY is required when AI_PROVIDER=gemini',
      });
    }
  });

export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;

export function parseApiEnvironment(input: Record<string, unknown>): ApiEnvironment {
  return apiEnvironmentSchema.parse(input);
}
