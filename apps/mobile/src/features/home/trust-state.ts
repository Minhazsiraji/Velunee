export const HOME_STALE_AFTER_MS = 5 * 60_000;

export type HomeTrustStatus = 'fresh' | 'stale' | 'offline' | 'refresh-error';

export interface HomeTrustState {
  status: HomeTrustStatus;
  updatedAt: number;
}

const OFFLINE_PATTERNS = [
  'network request failed',
  'failed to fetch',
  'networkerror',
  'internet connection',
  'offline',
  'econnrefused',
  'enotfound',
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.toLocaleLowerCase();
  if (typeof error === 'string') return error.toLocaleLowerCase();
  return '';
}

export function isLikelyOfflineError(error: unknown): boolean {
  const message = errorMessage(error);
  return OFFLINE_PATTERNS.some((pattern) => message.includes(pattern));
}

export function deriveHomeTrustState({
  now,
  updatedAt,
  errors,
}: {
  now: number;
  updatedAt: number;
  errors: unknown[];
}): HomeTrustState {
  const meaningfulErrors = errors.filter((error) => error !== null && error !== undefined);

  if (meaningfulErrors.some(isLikelyOfflineError)) {
    return { status: 'offline', updatedAt };
  }

  if (meaningfulErrors.length > 0) {
    return { status: 'refresh-error', updatedAt };
  }

  if (updatedAt <= 0 || now - updatedAt >= HOME_STALE_AFTER_MS) {
    return { status: 'stale', updatedAt };
  }

  return { status: 'fresh', updatedAt };
}
