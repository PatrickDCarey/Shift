/**
 * Status gate (phase 0), restart (phase 1), exit and death (phase 14) and the
 * respawn step (architecture.md §3.4, safe-tiles-and-reset.md).
 */
import type { DeathCause, InputFrame, Level, PlayerState, SimEvent, SimParams, SimState } from '../types';
import { createSim } from './create';
import { recordInput } from './input';
import { boxAt, overlapsTile } from './geometry';
import { bodyHit, type HitCtx } from './hazards';
import { postRespawn, tickFrozen } from './checkpoints';

/** A `restart` press: status restarting, respawn on the next step. Nothing else runs. */
export function restartState(state: SimState, input: InputFrame): SimState {
  const { checkpoint: _lit, ...rest } = state;
  return {
    ...rest,
    status: 'restarting',
    respawnInSteps: 0,
    player: { ...state.player },
    twin: state.twin && { ...state.twin },
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
  if (state.respawnInSteps <= 0) {
    return state.status === 'dead' && state.checkpoint ? postRespawn(state, input, level, params, state.checkpoint) : respawnState(input, level, params);
  }
  if (input.restart && !state.prevInput.restart) return restartState(state, input);
  return { ...state, ...tickFrozen(state), respawnInSteps: state.respawnInSteps - 1, player: { ...state.player }, twin: state.twin && { ...state.twin }, prevInput: recordInput(input), events: [] };
}

export type Outcome = 'won' | 'dead' | null;

export interface OutcomeResult {
  readonly player: PlayerState;
  readonly twin: PlayerState | null;
  readonly events: readonly SimEvent[];
  readonly outcome: Outcome;
}

const reachedExit = (p: PlayerState, level: Level, params: SimParams): boolean =>
  !p.home && overlapsTile(level, boxAt(p.x, p.y, params), (t) => t.kind === 'exit');
const fellOut = (p: PlayerState, level: Level, params: SimParams): boolean =>
  !p.home && boxAt(p.x, p.y, params).top > level.height;

/**
 * Phase 14 for every body: non-home bodies on an exit become home (a 'home' event
 * only in twin levels), all home = won, else any non-home body below the grid
 * = died (body id, 0 if both). Exit beats death.
 */
export function outcomePhase(
  player: PlayerState,
  twin: PlayerState | null,
  events: readonly SimEvent[],
  level: Level,
  params: SimParams,
  hits?: HitCtx,
): OutcomeResult {
  const homeNow = (p: PlayerState): PlayerState => (reachedExit(p, level, params) ? { ...p, home: true } : p);
  const p0 = homeNow(player);
  const p1 = twin && homeNow(twin);
  const homeEvents: SimEvent[] = [];
  if (twin && p0.home && !player.home) homeEvents.push({ type: 'home', body: 0 });
  if (p1 && twin && p1.home && !twin.home) homeEvents.push({ type: 'home', body: 1 });
  const out = (outcome: Outcome, extra: readonly SimEvent[]): OutcomeResult => ({
    player: p0,
    twin: p1,
    events: [...events, ...homeEvents, ...extra],
    outcome,
  });
  // `fallThrough` never fires on a won step (architecture.md 3.2): drop it from the step's body events.
  if (p0.home && (p1 === null || p1.home)) {
    return { ...out('won', [{ type: 'won' }]), events: [...events.filter((e) => e.type !== 'fallThrough'), ...homeEvents, { type: 'won' }] };
  }
  const fell0 = fellOut(p0, level, params);
  const fell1 = p1 !== null && fellOut(p1, level, params);
  const hit0 = hits !== undefined && bodyHit(level, params, p0, 0, hits);
  const hit1 = hits !== undefined && p1 !== null && bodyHit(level, params, p1, 1, hits);
  if (!fell0 && !fell1 && !hit0 && !hit1) return out(null, []);
  const body = fell0 || hit0 ? 0 : 1;
  const fell = body === 0 ? fell0 : fell1;
  const cause: { cause?: DeathCause } = fell ? {} : { cause: 'hit' };
  return out('dead', [{ type: 'died', body, ...cause }]);
}
