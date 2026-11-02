import { SIM_EPSILON, type PerBand, type SimParams } from '../types';

/** Speed segment index: n spans gearSpeeds[n] .. gearSpeeds[n+1]. */
type Segment = 0 | 1 | 2 | 3;

const UPPER_SEGMENTS: readonly Segment[] = [1, 2, 3];

/** Accelerating: the largest n with v[n] <= s (a speed on a gear speed starts its upper segment). */
function accelSegment(s: number, v: PerBand<number>): Segment {
  let n: Segment = 0;
  for (const i of UPPER_SEGMENTS) if (v[i] <= s + SIM_EPSILON) n = i;
  return n;
}

/** Braking: the largest n with v[n] < s (a speed on a gear speed brakes through the segment below). */
function brakeSegment(s: number, v: PerBand<number>): Segment {
  let n: Segment = 0;
  for (const i of UPPER_SEGMENTS) if (v[i] < s - SIM_EPSILON) n = i;
  return n;
}

/** dir * s, but never -0 (keeps states deep-equal and snapped zeros exact). */
const signed = (dir: number, s: number): number => (s === 0 ? 0 : dir * s);

/**
 * GDD §4.4 step 1 / §4.5: target is 0 or opposite to vx. In the walking range
 * stop instantly and, if a direction is held, start that way at
 * min(|T|, walking pace) on the same step; above it brake by the segment of
 * the start speed, keeping the direction (a skid).
 */
function slowDown(vx: number, targetVx: number, params: SimParams, walk: number): number {
  const s = Math.abs(vx);
  if (s <= walk + SIM_EPSILON) return signed(Math.sign(targetVx), Math.min(Math.abs(targetVx), walk));
  const n = brakeSegment(s, params.gearSpeeds);
  return signed(Math.sign(vx), Math.max(0, s - params.brake[n] * params.dt));
}

/**
 * GDD §4.4 step 2: moving with the target or standing. Speed s heads to t:
 * instant inside the walking range, otherwise accel/brake by the segment of
 * the start speed, clamped at t (never overshoots).
 */
function approach(s: number, t: number, params: SimParams, walk: number): number {
  const v = params.gearSpeeds;
  if (s < t) {
    if (s < walk - SIM_EPSILON) return Math.min(t, walk);
    return Math.min(t, s + params.accel[accelSegment(s, v)] * params.dt);
  }
  if (s > t) {
    if (s <= walk + SIM_EPSILON) return t;
    return Math.max(t, s - params.brake[brakeSegment(s, v)] * params.dt);
  }
  return s;
}

/**
 * One grounded speed update (GDD §4.4-4.5, step phase 4). `vx` is the
 * velocity at the start of the step, `targetVx` = d * gearSpeeds[gear].
 * Walking range is 0 .. gearSpeeds[instantMaxGear].
 */
export function groundSpeed(vx: number, targetVx: number, params: SimParams): number {
  const walk = params.gearSpeeds[params.instantMaxGear];
  const slowing = vx !== 0 && (targetVx === 0 || Math.sign(targetVx) !== Math.sign(vx));
  if (slowing) return slowDown(vx, targetVx, params, walk);
  const dir = vx !== 0 ? Math.sign(vx) : Math.sign(targetVx);
  return signed(dir, approach(Math.abs(vx), Math.abs(targetVx), params, walk));
}
