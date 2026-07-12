const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Enter a password.';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  if (!confirmation) return 'Re-enter your password.';
  if (password !== confirmation) {
    return 'Passwords do not match.';
  }
  return null;
}

/**
 * Supabase surfaces auth failures with terse, sometimes technical
 * messages. Map the common ones to friendlier copy for end users.
 */
export function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'That email and password combination is incorrect.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address, then sign in.';
  }
  if (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('user already exists')
  ) {
    return 'An account already exists for this email. Try signing in.';
  }
  if (normalized.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'Network problem. Check your connection and try again.';
  }

  return message || 'Something went wrong. Please try again.';
}
