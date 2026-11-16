/**
 * Render-side timing and interpolation maths. Pure. The accumulator only
 * decides WHEN steps run, never what they compute (architecture.md section 4).
 *
 * Owner: gameplay-engineer [scene].
 */
import type { SimState } from '../core/types';

/** Spiral-of-death guard: never run more than this many steps in one frame. */
export const MAX_STEPS_PER_FRAME = 5;

const EPS_MS = 1e-6;

export interface ClockAdvance {
  /** Whole sim steps to run this frame. */
  readonly steps: number;
  /** Leftover time after those steps, ms, in [0, stepMs). */
  readonly acc: number;
  /** Render blend between the previous and the current state, 0..1. */
  readonly alpha: number;
}

/** Add a frame's time to the accumulator and split it into whole steps. */
export function advanceClock(acc: number, deltaMs: number, stepMs: number, maxSteps = MAX_STEPS_PER_FRAME): ClockAdvance {
  const delta = Math.min(Math.max(0, deltaMs), stepMs * maxSteps);
  const total = acc + delta;
  const steps = Math.min(maxSteps, Math.floor((total + EPS_MS) / stepMs));
  const left = Math.max(0, total - steps * stepMs);
  return { steps, acc: left, alpha: Math.min(1, left / stepMs) };
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Feet position of one body to draw (0 runner, 1 twin; null when there is no
 * such body). Blends only between two consecutive playing steps; across a
 * death, respawn or restart the new position is shown at once so the body
 * never slides back to the spawn.
 */
export function renderBodyPosition(prev: SimState, cur: SimState, alpha: number, body: 0 | 1): Point | null {
  const now = body === 0 ? cur.player : cur.twin;
  const before = body === 0 ? prev.player : prev.twin;
  if (now === null) return null;
  const consecutive = before !== null && prev.status === 'playing' && cur.status === 'playing' && cur.step === prev.step + 1;
  if (!consecutive) return { x: now.x, y: now.y };
  return { x: lerp(before.x, now.x, alpha), y: lerp(before.y, now.y, alpha) };
}

/** Feet position of the runner to draw; see `renderBodyPosition`. */
export function renderPosition(prev: SimState, cur: SimState, alpha: number): Point {
  return renderBodyPosition(prev, cur, alpha, 0) ?? { x: cur.player.x, y: cur.player.y };
}

/** Exponential ease of `current` toward `target` over a frame of `deltaMs` (time constant `tauMs`). */
export function easeToward(current: number, target: number, deltaMs: number, tauMs: number): number {
  if (tauMs <= 0) return target;
  return lerp(current, target, 1 - Math.exp(-Math.max(0, deltaMs) / tauMs));
}
