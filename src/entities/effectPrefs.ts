/**
 * The reduced-motion and reduced-effects flags as the scene uses them, and the
 * re-read that applies a change made in Settings from pause (settings.md W7)
 * on resume and on R, without a level reload. Pure but for the targets it is
 * handed. Owner: gameplay-engineer [scene].
 */
import { effectModes, type EffectModes } from '../fx';
import { reducedMotion } from './motionPrefs';

export interface EffectPrefs {
  readonly reducedMotion: boolean;
  readonly reducedEffects: boolean;
}

export interface SavedFlags {
  readonly reducedMotion: boolean;
  readonly reducedMotionChosen: boolean;
  readonly reducedEffects: boolean;
}

/** Saved choice first, then the OS preference (for motion only). */
export function readEffectPrefs(settings: SavedFlags, osPrefersMotion: boolean): EffectPrefs {
  return { reducedMotion: reducedMotion(settings, osPrefersMotion), reducedEffects: settings.reducedEffects };
}

/** What a flag change has to reach. */
export interface PrefTargets {
  setReducedMotion(reduced: boolean): void;
  setModes(modes: EffectModes): void;
}

/** Pushes `next` to the targets if it differs from `prev`; returns the prefs now in force. */
export function applyEffectPrefs(prev: EffectPrefs, next: EffectPrefs, hasTwin: boolean, targets: PrefTargets): EffectPrefs {
  if (prev.reducedMotion === next.reducedMotion && prev.reducedEffects === next.reducedEffects) return prev;
  targets.setReducedMotion(next.reducedMotion);
  targets.setModes(effectModes(next, hasTwin));
  return next;
}
