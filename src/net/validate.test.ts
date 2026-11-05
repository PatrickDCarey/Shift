import { describe, expect, it } from 'vitest';
import { clampInt, isLevelId, isLevelVersion } from './validate';

describe('validate helpers', () => {
  it('isLevelId matches the SQL check', () => {
    expect(['w0-01', 'w5-99', 'w1-03'].every(isLevelId)).toBe(true);
    expect(['w6-01', 'w1-3', 'W1-03', 'w1-03 ', '', 5, null].some(isLevelId)).toBe(false);
  });

  it('isLevelVersion wants a positive 32-bit integer', () => {
    expect(isLevelVersion(1)).toBe(true);
    expect([0, -1, 1.2, 2 ** 31, Number.NaN, '1'].some(isLevelVersion)).toBe(false);
  });

  it('clampInt floors, clamps and falls back', () => {
    expect(clampInt(7.9, 1, 10, 5)).toBe(7);
    expect(clampInt(-4, 1, 10, 5)).toBe(1);
    expect(clampInt(99, 1, 10, 5)).toBe(10);
    expect(clampInt(Number.NaN, 1, 10, 5)).toBe(5);
    expect(clampInt('3', 1, 10, 5)).toBe(5);
  });
});
