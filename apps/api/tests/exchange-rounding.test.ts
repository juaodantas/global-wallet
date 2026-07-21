import { describe, expect, it } from 'vitest';
import { calculateTargetAmountMinor } from '../src/modules/exchange/domain/rounding.js';

describe('exchange rounding', () => {
  it('rounds converted minor amounts half up using the persisted decimal rate', () => {
    expect(calculateTargetAmountMinor(101, '1.2345678901')).toBe(125);
  });

  it('rejects malformed rates before BigInt conversion', () => {
    expect(() => calculateTargetAmountMinor(100, '.1234567890')).toThrow('Exchange rate is outside supported format');
  });
});
