export const APP_NAME = 'Velunee';
export const APP_TAGLINE = 'Ask. Decide. Shine.';
export const API_VERSION = 'v1';

export type InputMode = 'text' | 'voice' | 'image';
export type SupportedLocale = string;

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}

export function redact(value: string, visible = 4): string {
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}${'*'.repeat(Math.min(12, value.length - visible))}`;
}
