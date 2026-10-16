import { describe, expect, it } from 'vitest';
import { normalizeEmailDeliveryStatus } from '../../../mobile/src/services/api.ts';

describe('mobile email delivery compatibility', () => {
  it('preserves pending from the current backend', () => {
    expect(normalizeEmailDeliveryStatus('pending')).toBe('pending');
  });

  it('falls back safely for missing or unknown legacy delivery values', () => {
    expect(normalizeEmailDeliveryStatus(undefined)).toBe('disabled');
    expect(normalizeEmailDeliveryStatus('unexpected raw upstream value')).toBe('disabled');
  });

  it.each(['sent', 'failed', 'disabled'] as const)('preserves %s', status => {
    expect(normalizeEmailDeliveryStatus(status)).toBe(status);
  });
});
