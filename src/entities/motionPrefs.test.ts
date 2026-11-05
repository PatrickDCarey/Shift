import { describe, expect, it } from 'vitest';
import { prefersReducedMotion, reducedMotion } from './motionPrefs';

describe('reducedMotion', () => {
  it('is on if either the saved setting or the OS preference is on', () => {
    expect(reducedMotion({ reducedMotion: false }, false)).toBe(false);
    expect(reducedMotion({ reducedMotion: true }, false)).toBe(true);
    expect(reducedMotion({ reducedMotion: false }, true)).toBe(true);
  });
});

describe('prefersReducedMotion', () => {
  it('reads matchMedia', () => {
    expect(prefersReducedMotion((q) => ({ matches: q.includes('reduce') }))).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });

  it('is false when matchMedia is missing or throws', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(
      prefersReducedMotion(() => {
        throw new Error('no');
      }),
    ).toBe(false);
  });
});
