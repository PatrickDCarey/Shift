import { describe, expect, it } from 'vitest';
import { prefersReducedMotion, reducedMotion } from './motionPrefs';

describe('reducedMotion', () => {
  const s = (reducedMotion: boolean, reducedMotionChosen: boolean) => ({ reducedMotion, reducedMotionChosen });

  it('uses the saved choice when one was made, even against the OS', () => {
    expect(reducedMotion(s(true, true), false)).toBe(true);
    expect(reducedMotion(s(false, true), true)).toBe(false);
  });

  it('follows the OS preference when nothing was chosen', () => {
    expect(reducedMotion(s(false, false), true)).toBe(true);
    expect(reducedMotion(s(false, false), false)).toBe(false);
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
