import { describe, expect, it, vi } from 'vitest';
import { applyEffectPrefs, readEffectPrefs, type PrefTargets } from './effectPrefs';

const saved = (over: Partial<{ reducedMotion: boolean; reducedMotionChosen: boolean; reducedEffects: boolean }> = {}) => ({
  reducedMotion: false,
  reducedMotionChosen: false,
  reducedEffects: false,
  ...over,
});

describe('readEffectPrefs', () => {
  it('uses the OS preference until the player has chosen', () => {
    expect(readEffectPrefs(saved(), true).reducedMotion).toBe(true);
    expect(readEffectPrefs(saved({ reducedMotion: false, reducedMotionChosen: true }), true).reducedMotion).toBe(false);
  });

  it('reads reduced effects from the saved settings', () => {
    expect(readEffectPrefs(saved({ reducedEffects: true }), false).reducedEffects).toBe(true);
  });
});

const targets = (): PrefTargets => ({
  setReducedMotion: vi.fn(),
  setModes: vi.fn(),
});

describe('applyEffectPrefs', () => {
  const off = { reducedMotion: false, reducedEffects: false };

  it('does nothing and returns the same prefs when nothing changed', () => {
    const t = targets();
    expect(applyEffectPrefs(off, readEffectPrefs(saved(), false), false, t)).toBe(off);
    expect(t.setReducedMotion).not.toHaveBeenCalled();
    expect(t.setModes).not.toHaveBeenCalled();
  });

  it('applies a flag changed while paused: motion and effects reach every target', () => {
    const t = targets();
    const next = applyEffectPrefs(off, readEffectPrefs(saved({ reducedMotion: true, reducedMotionChosen: true, reducedEffects: true }), false), false, t);
    expect(next).toEqual({ reducedMotion: true, reducedEffects: true });
    expect(t.setReducedMotion).toHaveBeenCalledWith(true);
    const modes = vi.mocked(t.setModes).mock.calls[0]?.[0];
    expect(modes?.ringBurst).toBe(false); // reduced motion
    expect(modes?.stars).toBe(false); // reduced effects
  });

  it('a single flag change is enough, and a twin level keeps its wipe off', () => {
    const t = targets();
    applyEffectPrefs(off, { reducedMotion: false, reducedEffects: true }, true, t);
    expect(t.setModes).toHaveBeenCalledTimes(1);
    expect(vi.mocked(t.setModes).mock.calls[0]?.[0].screenWipe).toBe(false);
  });
});
