import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveHomeTrustState,
  HOME_STALE_AFTER_MS,
  isLikelyOfflineError,
} from '../src/features/home/trust-state.ts';

const NOW = new Date('2026-08-02T16:00:00.000Z').getTime();

test('keeps recently refreshed Home data fresh', () => {
  assert.equal(
    deriveHomeTrustState({ now: NOW, updatedAt: NOW - 60_000, errors: [] }).status,
    'fresh',
  );
});

test('marks data stale at the five-minute trust boundary', () => {
  assert.equal(
    deriveHomeTrustState({ now: NOW, updatedAt: NOW - HOME_STALE_AFTER_MS, errors: [] }).status,
    'stale',
  );
});

test('shows offline before stale when the refresh failed because of connectivity', () => {
  assert.equal(
    deriveHomeTrustState({
      now: NOW,
      updatedAt: NOW - HOME_STALE_AFTER_MS,
      errors: [new TypeError('Network request failed')],
    }).status,
    'offline',
  );
});

test('distinguishes a server refresh error from offline', () => {
  assert.equal(
    deriveHomeTrustState({
      now: NOW,
      updatedAt: NOW - 60_000,
      errors: [new Error('Service unavailable')],
    }).status,
    'refresh-error',
  );
});

test('recognizes common native and web connection errors', () => {
  assert.equal(isLikelyOfflineError(new TypeError('Failed to fetch')), true);
  assert.equal(isLikelyOfflineError(new Error('Unexpected response')), false);
});
