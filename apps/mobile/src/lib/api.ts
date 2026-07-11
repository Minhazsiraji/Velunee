import {
  DEVELOPMENT_USER_ID,
  environment,
} from './environment';
import { getSupabaseClient } from './supabase';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authorizationHeaders(): Promise<
  Record<string, string>
> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } =
      await supabase.auth.getSession();

    if (error) {
      throw new ApiError(
        `Unable to read your session: ${error.message}`,
        401,
      );
    }

    const accessToken = data.session?.access_token;

    if (accessToken) {
      return {
        Authorization: `Bearer ${accessToken}`,
      };
    }
  }

  if (environment.allowDevelopmentUserFallback) {
    return {
      'x-dev-user-id': DEVELOPMENT_USER_ID,
    };
  }

  throw new ApiError(
    'Your Velunee session is unavailable. Please sign out and sign in again.',
    401,
  );
}

function readErrorMessage(
  payload: unknown,
  status: number,
): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload
  ) {
    const message = (
      payload as { message: unknown }
    ).message;

    if (Array.isArray(message)) {
      return message.map(String).join('\n');
    }

    return String(message);
  }

  return `Request failed with status ${status}.`;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  headers.set('Accept', 'application/json');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const authHeaders = await authorizationHeaders();

  Object.entries(authHeaders).forEach(
    ([key, value]) => {
      headers.set(key, value);
    },
  );

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, environment.apiTimeoutMs);

  try {
    const response = await fetch(
      `${environment.apiUrl}${path}`,
      {
        ...init,
        headers,
        signal: controller.signal,
      },
    );

    const payload = (await response
      .json()
      .catch(() => null)) as unknown;

    if (!response.ok) {
      throw new ApiError(
        readErrorMessage(payload, response.status),
        response.status,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new ApiError(
        'The server took too long to respond. Please try again.',
        408,
      );
    }

    throw new ApiError(
      'Unable to reach the Velunee server. Check your connection and try again.',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
}
