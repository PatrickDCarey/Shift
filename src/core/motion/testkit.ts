/**
 * TEST-ONLY helpers for the motion lane. Not exported from index.ts and never
 * used by game code. They iterate the motion functions step by step so the
 * multi-step acceptance numbers in docs/design/features/movement-and-gears.md
 * and air-drag.md can be checked before the sim lane exists.
 *
 * They model only what the motion lane owns plus the two sim rules that are
 * pure arithmetic: `dx = (vxOld + vx) / 2 * dt` (phase 7, no walls) and
 * gear-follows-band in the air (phase 10). Jump arcs, collisions and landing
 * live in the sim lane, so flight length is an input here.
 */
import { tuningErrors, type Band, type Gear, type SimParams, type Tuning } from '../types';
import { airDrag } from './drag';
import { bandForSpeed } from './bands';
import { groundSpeed } from './ground';
import { segmentRates } from './rates';

const msToSteps = (ms: number, stepHz: number): number => Math.round((ms * stepHz) / 1000);

/**
 * Test stand-in for the sim lane's `deriveParams` (formulas from the SimParams
 * docs). Only the motion fields matter for these tests.
 */
export function paramsForTests(t: Tuning): SimParams {
  const apex = msToSteps(t.jumpTimeToApexMs, t.stepHz) / t.stepHz;
  return {
    stepHz: t.stepHz,
    dt: 1 / t.stepHz,
    gearSpeeds: t.gearSpeeds,
    minGear: t.minGear,
    startGear: t.startGear,
    instantMaxGear: t.instantMaxGear,
    accel: segmentRates(t.gearSpeeds, t.tilesPerGearChange),
    brake: segmentRates(t.gearSpeeds, t.brakeTilesPerGearChange),
    colorBandEdges: t.colorBandEdges,
    airDragTilesPerGear: t.airDragTilesPerGear,
    airDragMinBand: t.airDragMinBand,
    gravity: (2 * t.jumpHeightTiles) / (apex * apex),
    jumpSpeed: (2 * t.jumpHeightTiles) / apex,
    maxFallSpeed: t.maxFallSpeed,
    coyoteSteps: msToSteps(t.coyoteMs, t.stepHz),
    jumpBufferSteps: msToSteps(t.jumpBufferMs, t.stepHz),
    shiftBufferSteps: msToSteps(t.shiftBufferMs, t.stepHz),
    colorGraceSteps: msToSteps(t.colorGraceMs, t.stepHz),
    deathFreezeSteps: msToSteps(t.deathFreezeMs, t.stepHz),
    playerWidth: t.playerWidthTiles,
    playerHeight: t.playerHeightTiles,
    mudMaxGear: t.mudMaxGear,
    boostPadGear: t.boostPadGear,
    ghostSpacingTiles: t.ghostSpacingTiles,
    ghostLifetimeSteps: msToSteps(t.ghostLifetimeMs, t.stepHz),
  };
}

/** Validates raw tuning JSON (fail fast with its errors), then derives params. */
export function paramsFromJson(raw: unknown): SimParams {
  const errors = tuningErrors(raw);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  return paramsForTests(raw as Tuning);
}

/** State after one step. `step` counts from 1; `x` is the distance since step 0. */
export interface Sample {
  readonly step: number;
  readonly vx: number;
  readonly x: number;
  readonly band: Band;
}

/**
 * Grounded steps on a flat, wall-free floor. `targetAt(step)` returns
 * d * gearSpeeds[gear] for that step (shifts already applied, phase 2).
 */
export function runGround(
  params: SimParams,
  vx0: number,
  steps: number,
  targetAt: (step: number) => number,
): Sample[] {
  const out: Sample[] = [];
  let vx = vx0;
  let x = 0;
  for (let step = 1; step <= steps; step += 1) {
    const next = groundSpeed(vx, targetAt(step), params);
    x += ((vx + next) / 2) * params.dt;
    vx = next;
    out.push({ step, vx, x, band: bandForSpeed(Math.abs(vx), params.colorBandEdges) });
  }
  return out;
}

export interface FlightSample extends Sample {
  readonly airDistance: number;
  readonly dropped: boolean;
  readonly gear: Gear;
}

/**
 * `flightSteps` airborne steps (flight step 1 = launch step) with no wall:
 * vx is unchanged by input, x moves by the trapezoid rule, then drag (phase 9)
 * and gear-follows-band (phase 10) run. The launch-step ground update is
 * assumed done already (cruising: no change).
 */
export function runFlight(params: SimParams, vx0: number, gear0: Gear, flightSteps: number): FlightSample[] {
  const out: FlightSample[] = [];
  let vx = vx0;
  let x = 0;
  let airDistance = 0;
  let gear = gear0;
  for (let step = 1; step <= flightSteps; step += 1) {
    const dx = vx * params.dt;
    x += dx;
    const drag = airDrag(vx, airDistance + Math.abs(dx), params);
    vx = drag.vx;
    airDistance = drag.airDistance;
    const band = bandForSpeed(Math.abs(vx), params.colorBandEdges);
    gear = Math.max(params.minGear, Math.min(gear, band)) as Gear;
    out.push({ step, vx, x, band, airDistance, dropped: drag.dropped, gear });
  }
  return out;
}

/** First sample matching `pred`; throws so a missing event fails loudly. */
export function firstWhere<T extends Sample>(trace: readonly T[], pred: (s: T) => boolean): T {
  const found = trace.find(pred);
  if (!found) throw new Error('no step matched');
  return found;
}
