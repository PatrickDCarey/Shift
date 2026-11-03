/**
 * Status gate (phase 0), restart (phase 1), exit and death (phase 14) and the
 * respawn step (architecture.md §3.4, safe-tiles-and-reset.md).
 */
import type { InputFrame, Level, SimParams, SimState } from '../types';
import { createSim } from './create';
import { recordInput } from './input';
import { boxAt, overlapsTile } from './geometry';
import { emit, type Work } from './work';

/** A `restart` press: status restarting, respawn on the next step. Nothing else runs. */
export function restartState(state: SimState, input: InputFrame): SimState {
  return {
    ...state,
    status: 'restarting',
    respawnInSteps: 0,
    player: { ...state.player },
    prevInput: recordInput(input),
    events: [{ type: 'restart' }],
  };
}

/** The respawn step: exactly the fresh-load state except prevInput (held buttons are not new presses). */
export function respawnState(input: InputFrame, level: Level, params: SimParams): SimState {
  return { ...createSim(level, params), prevInput: recordInput(input) };
}

/** A step while dead or restarting: respawn, restart, or stay frozen (inputs ignored but recorded). */
export function frozenStep(state: SimState, input: InputFrame, level: Level, params: SimParams): SimState {
  if (state.respawnInSteps <= 0) return respawnState(input, level, params);
  if (input.restart && !state.prevInput.restart) return restartState(state, input);
  return { ...state, respawnInSteps: state.respawnInSteps - 1, player: { ...state.player }, prevInput: recordInput(input), events: [] };
}

export type Outcome = 'won' | 'dead' | null;

export interface OutcomeResult {
  readonly work: Work;
  readonly outcome: Outcome;
}

/** Phase 14: the box overlapping an exit wins; else the box top below the grid kills. Exit first. */
export function outcomePhase(w: Work, level: Level, params: SimParams): OutcomeResult {
  const box = boxAt(w.player.x, w.player.y, params);
  if (overlapsTile(level, box, (t) => t.kind === 'exit')) return { work: emit(w, { type: 'won' }), outcome: 'won' };
  if (box.top > level.height) return { work: emit(w, { type: 'died' }), outcome: 'dead' };
  return { work: w, outcome: null };
}
