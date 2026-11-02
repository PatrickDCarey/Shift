/**
 * Loads the shipped tuning, validates it and derives the sim params.
 * `tileSize` is render-only and lives in the tuning, not in `SimParams`.
 *
 * Owner: gameplay-engineer [scene].
 */
import { deriveParams, isTuning, tuningErrors, type SimParams, type Tuning } from '../core';
import tuningJson from '../data/tuning.json';

export interface GameParams {
  readonly tuning: Tuning;
  readonly params: SimParams;
}

/** Throws with the schema messages if tuning.json is malformed (fail fast, never run a bad sim). */
export function loadGameParams(raw: unknown = tuningJson): GameParams {
  if (!isTuning(raw)) throw new Error(`invalid tuning:\n${tuningErrors(raw).join('\n')}`);
  return { tuning: raw, params: deriveParams(raw) };
}
