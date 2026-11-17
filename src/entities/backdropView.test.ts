import { describe, expect, it } from 'vitest';
import { ridgeOffset } from './BackdropView';

describe('ridgeOffset', () => {
  it('is whole pixels, wraps inside one 480 px tile and is 0 at rest', () => {
    expect(ridgeOffset(0, 0.3)).toBe(-0);
    expect(ridgeOffset(1000, 0.3)).toBe(-300);
    expect(ridgeOffset(2000, 0.3)).toBe(-120);
    for (const x of [0, 7, 333, 9999]) {
      const o = ridgeOffset(x, 0.15);
      expect(Number.isInteger(o)).toBe(true);
      expect(o).toBeLessThanOrEqual(0);
      expect(o).toBeGreaterThan(-480);
    }
  });

  it('moves far slower than near', () => {
    expect(Math.abs(ridgeOffset(400, 0.15))).toBeLessThan(Math.abs(ridgeOffset(400, 0.3)));
  });
});
