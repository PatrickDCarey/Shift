/**
 * Which effects run, and when, for the two accessibility settings (docs/design/features/pixel-effects.md).
 * Pure and render-only: the scene reads settings and sim events, asks this module, and draws. It never
 * touches sim state. Owner: art-director.
 *
 *  - `reducedEffects` removes decoration (afterimages, speed lines, dust, horizon dither and stars).
 *  - `reducedMotion` removes flashes, the screen wipe, scrolling parallax and the exit pulse.
 *  - The drag-drop cue is gameplay information and is never fully removed, in any mode.
 */
import { palette } from './palette';

export interface EffectSettings {
  readonly reducedEffects: boolean;
  readonly reducedMotion: boolean;
}

export const FULL_EFFECTS: EffectSettings = { reducedEffects: false, reducedMotion: false };

export type DustMode = 'full' | 'static' | 'off';

export interface EffectModes {
  /** White frame plus white-outlined frame on a band change. Off under reduced motion (swap only). */
  readonly shiftFrames: boolean;
  /** Ring burst on the body at an air-drag drop. */
  readonly ringBurst: boolean;
  /** Frames the white-outlined body frame is held on a drop when `shiftFrames` is off; 0 when it is not needed. */
  readonly dropHoldFrames: number;
  /** Two-frame dither screen wipe on a drop: single-body levels only. */
  readonly screenWipe: boolean;
  readonly afterimages: boolean;
  readonly speedLines: boolean;
  /** `static` = specks that appear and stay without drifting. */
  readonly dust: DustMode;
  /** Dithered horizon glow and stars. The field (flat background) tint is always on. */
  readonly horizonDither: boolean;
  readonly stars: boolean;
  /** Ridges scroll with the camera. Off: ridges are fixed to the screen. */
  readonly ridgeParallax: boolean;
  /** Exit door cycles its sparkle. Off: hold `door_0`. */
  readonly exitPulse: boolean;
  /** Death flash and scatter. Off: hold the crack frame. */
  readonly deathFlash: boolean;
}

/** Settings to effect modes: the table in pixel-effects.md ("both on" takes the stricter entry of each row). */
export function effectModes(settings: EffectSettings, hasTwin: boolean): EffectModes {
  const { reducedEffects: fx, reducedMotion: motion } = settings;
  return {
    shiftFrames: !motion,
    ringBurst: !motion,
    dropHoldFrames: motion ? 2 : 0,
    screenWipe: !motion && !hasTwin,
    afterimages: !fx && !motion,
    speedLines: !fx && !motion,
    dust: fx ? 'off' : motion ? 'static' : 'full',
    horizonDither: !fx,
    stars: !fx,
    ridgeParallax: !motion,
    exitPulse: !motion,
    deathFlash: !motion,
  };
}

/** The exit sparkle cycle (frame indices into `tile/exit/door_<n>` and `glow_<n>`), one entry per step. */
export const EXIT_PULSE_CYCLE: readonly number[] = [0, 1, 2, 3, 2, 1];
/** Milliseconds per step of the cycle: 6 steps x 280 ms = 1.68 s per pulse, well under any flash threshold. */
export const EXIT_PULSE_STEP_MS = 280;

/** The door frame to show at `timeMs` (wall-clock render time; the sim is not involved). Reduced motion holds frame 0. */
export function exitPulseFrame(timeMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  const step = Math.floor(Math.max(0, timeMs) / EXIT_PULSE_STEP_MS) % EXIT_PULSE_CYCLE.length;
  return EXIT_PULSE_CYCLE[step] ?? 0;
}

export interface WipeStep {
  /** Index into `fx/wipe/<n>`. */
  readonly frame: number;
  readonly alpha: number;
}

/** The wipe at `elapsedMs` after the drop: frame 0 for the first half of `flash.durationMs`, frame 1 for the second, then done (null). */
export function wipeAt(elapsedMs: number): WipeStep | null {
  const half = palette.flash.durationMs / 2;
  if (elapsedMs < 0 || elapsedMs >= palette.flash.durationMs) return null;
  return { frame: elapsedMs < half ? 0 : 1, alpha: palette.flash.alpha };
}

/** At most this many white flashes or wipes per second across the screen, both bodies included. */
export const MAX_FLASHES_PER_SECOND = 3;

/** Flash start times in the last second, oldest first. Treat as immutable. */
export type FlashHistory = readonly number[];

/** Ask to start a flash at `nowMs`. Returns whether it may play (otherwise show the swap only) and the new history. */
export function requestFlash(history: FlashHistory, nowMs: number): { allowed: boolean; history: FlashHistory } {
  const recent = history.filter((t) => nowMs - t < 1000 && t <= nowMs);
  if (recent.length >= MAX_FLASHES_PER_SECOND) return { allowed: false, history: recent };
  return { allowed: true, history: [...recent, nowMs] };
}
