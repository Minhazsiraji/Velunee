export function formatMinor(currency: string, amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);
  const whole = Math.floor(absolute / 100);
  const cents = absolute % 100;
  const wholeFormatted = whole.toLocaleString('en-US');
  return cents > 0
    ? `${sign}${currency} ${wholeFormatted}.${String(cents).padStart(2, '0')}`
    : `${sign}${currency} ${wholeFormatted}`;
}

// "1,250.5" -> 125050 minor units. Returns null for anything unusable.
export function parseMajorToMinor(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Math.round(Number(cleaned) * 100);
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

export function minorToMajorText(amountMinor: number): string {
  const whole = Math.floor(amountMinor / 100);
  const cents = amountMinor % 100;
  return cents > 0 ? `${whole}.${String(cents).padStart(2, '0')}` : String(whole);
}

// Local device date, so "today" follows the user's timezone.
export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function currentMonth(): string {
  return todayIso().slice(0, 7);
}
