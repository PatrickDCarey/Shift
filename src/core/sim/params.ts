/**
 * Tuning loader: Tuning (design-lead's JSON units) -> SimParams (tiles, tiles/s,
 * whole steps). The only place milliseconds become steps (architecture.md §3).
 */
import { segmentRates } from '../motion';
import { tuningErrors, type SimParams, type Tuning } from '../types';

/** `round(ms * stepHz / 1000)` (GDD §4.1). */
export const msToSteps = (ms: number, stepHz: number): number => Math.round((ms * stepHz) / 1000);

/** Fails fast with the schema messages so a bad tuning.json never reaches the sim. */
function assertValid(tuning: Tuning): void {
  const errors = tuningErrors(tuning);
  if (errors.length > 0) throw new Error(`invalid tuning:\n${errors.join('\n')}`);
  if (msToSteps(tuning.jumpTimeToApexMs, tuning.stepHz) < 1) {
    throw new Error('invalid tuning:\ntuning.jumpTimeToApexMs: must be at least one step');
  }
}

/**
 * Derived constants (SimParams docs in contracts/tuning.ts). Gravity and
 * launch speed use the apex time rounded to whole steps, so the apex falls
 * exactly on a step: g = 2h / t^2, launch = 2h / t.
 */
export function deriveParams(tuning: Tuning): SimParams {
  assertValid(tuning);
  const { stepHz } = tuning;
  const steps = (ms: number): number => msToSteps(ms, stepHz);
  const apex = steps(tuning.jumpTimeToApexMs) / stepHz;
  return {
    stepHz,
    dt: 1 / stepHz,
    gearSpeeds: tuning.gearSpeeds,
    minGear: tuning.minGear,
    startGear: tuning.startGear,
    instantMaxGear: tuning.instantMaxGear,
    accel: segmentRates(tuning.gearSpeeds, tuning.tilesPerGearChange),
    brake: segmentRates(tuning.gearSpeeds, tuning.brakeTilesPerGearChange),
    colorBandEdges: tuning.colorBandEdges,
    airDragTilesPerGear: tuning.airDragTilesPerGear,
    airDragMinBand: tuning.airDragMinBand,
    gravity: (2 * tuning.jumpHeightTiles) / (apex * apex),
    jumpSpeed: (2 * tuning.jumpHeightTiles) / apex,
    maxFallSpeed: tuning.maxFallSpeed,
    coyoteSteps: steps(tuning.coyoteMs),
    jumpBufferSteps: steps(tuning.jumpBufferMs),
    shiftBufferSteps: steps(tuning.shiftBufferMs),
    colorGraceSteps: steps(tuning.colorGraceMs),
    deathFreezeSteps: steps(tuning.deathFreezeMs),
    playerWidth: tuning.playerWidthTiles,
    playerHeight: tuning.playerHeightTiles,
    mudMaxGear: tuning.mudMaxGear,
    boostPadGear: tuning.boostPadGear,
    ghostSpacingTiles: tuning.ghostSpacingTiles,
    ghostLifetimeSteps: steps(tuning.ghostLifetimeMs),
  };
}
