import { describe, expect, it } from 'vitest';
import { effectProgress, flashAllowed, flashAlpha } from './effectMath';

describe('flashAlpha', () => {
  it('fades linearly from the peak to zero', () => {
    expect(flashAlpha(0.4, 0, 100)).toBe(0.4);
    expect(flashAlpha(0.4, 50, 100)).toBeCloseTo(0.2);
    expect(flashAlpha(0.4, 100, 100)).toBe(0);
    expect(flashAlpha(0.4, 500, 100)).toBe(0);
  });

  it('is zero for a zero duration', () => {
    expect(flashAlpha(0.4, 0, 0)).toBe(0);
  });
});

describe('effectProgress', () => {
  it('runs 0..1 then ends', () => {
    expect(effectProgress(0, 200)).toBe(0);
    expect(effectProgress(50, 200)).toBe(0.25);
    expect(effectProgress(200, 200)).toBeNull();
    expect(effectProgress(0, 0)).toBeNull();
  });
});

describe('flashAllowed', () => {
  it('allows the first flash', () => {
    expect(flashAllowed(null, 0)).toBe(true);
  });

  it('allows at most 3 per second', () => {
    expect(flashAllowed(0, 300)).toBe(false);
    expect(flashAllowed(0, 334)).toBe(true);
  });
});
