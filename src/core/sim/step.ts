/**
 * One fixed step in the normative order of architecture.md §3.1. Pure: the
 * input state is never mutated and every step returns fresh objects.
 */
import type { BodyId, InputFrame, Level, PlayerState, SimParams, SimState } from '../types';
import { bandPhase, dragPhase, landingPhase } from './air';
import { gracePhase, timersPhase } from './grace';
import { directionPhase, heldDir, nextPriority, pressEdges, recordInput, shiftPhase } from './input';
import { gravityPhase, groundPhase, jumpPhase } from './jump';
import { kineticStep, litCheckpoint } from './checkpoints';
import { carryPhase } from './movers';
import { moveXPhase, moveYPhase } from './move';
import { frozenStep, outcomePhase, restartState } from './status';
import type { Phase, StepCtx, Work } from './work';

/** Phases 2-13 in order (phase 1 builds the context, 14-15 finish in `step`). */
const PHASES: readonly Phase[] = [
  shiftPhase,
  directionPhase,
  groundPhase,
  jumpPhase,
  gravityPhase,
  carryPhase,
  moveXPhase,
  moveYPhase,
  dragPhase,
  bandPhase,
  landingPhase,
  gracePhase,
  timersPhase,
];

/** Phases 2-13 for one body (a home body is skipped by the caller). */
function runBody(p: PlayerState, ctx: StepCtx): Work {
  const start: Work = { player: p, events: [], vxOld: p.vx, jumped: false, dy: 0, dxMoved: 0 };
  return PHASES.reduce((w, phase) => phase(w, ctx), start);
}

const bodyCtx = (base: StepCtx, body: BodyId, p: PlayerState): StepCtx => ({
  ...base,
  body,
  startGrounded: p.grounded,
  startBand: p.band,
});

function playingStep(state: SimState, input: InputFrame, base: StepCtx): SimState {
  const w0 = state.player.home ? null : runBody(state.player, bodyCtx(base, 0, state.player));
  const w1 = state.twin && !state.twin.home ? runBody(state.twin, bodyCtx(base, 1, state.twin)) : null;
  const events = [...(w0?.events ?? []), ...(w1?.events ?? [])];
  const res = outcomePhase(w0?.player ?? state.player, w1?.player ?? state.twin, events, base.level, base.params, {
    t1: base.t + 1,
    startBands: [state.player.band, state.twin?.band ?? 0],
  });
  const next = state.step + 1;
  const lit = res.outcome === 'won' ? state.checkpoint : litCheckpoint(base.level, base.params, res.player, state.checkpoint);
  return {
    step: next,
    status: res.outcome ?? 'playing',
    wonAtStep: res.outcome === 'won' ? next : null,
    respawnInSteps: res.outcome === 'dead' ? base.params.deathFreezeSteps : 0,
    player: res.player,
    twin: res.twin,
    prevInput: recordInput(input),
    dirPriority: base.dirPriority,
    events: res.events,
    ...(lit ? { checkpoint: lit } : {}),
  };
}

export function step(state: SimState, input: InputFrame, level: Level, params: SimParams): SimState {
  if (state.status === 'won') return { ...state, player: { ...state.player }, twin: state.twin && { ...state.twin }, prevInput: recordInput(input), events: [] };
  if (state.status !== 'playing') return frozenStep(state, input, level, params);
  const pressed = pressEdges(input, state.prevInput);
  if (pressed.restart) return restartState(state, input);
  const dirPriority = nextPriority(state.dirPriority, pressed);
  const ctx: StepCtx = {
    body: 0,
    t: kineticStep(state),
    input,
    pressed,
    level,
    params,
    startGrounded: state.player.grounded,
    startBand: state.player.band,
    dirPriority,
    moveDir: heldDir(input, dirPriority),
  };
  return playingStep(state, input, ctx);
}
