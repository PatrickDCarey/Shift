/**
 * One fixed step in the normative order of architecture.md §3.1. Pure: the
 * input state is never mutated and every step returns fresh objects.
 */
import type { InputFrame, Level, SimParams, SimState } from '../types';
import { bandPhase, dragPhase, landingPhase } from './air';
import { gracePhase, timersPhase } from './grace';
import { directionPhase, heldDir, nextPriority, pressEdges, recordInput, shiftPhase } from './input';
import { gravityPhase, groundPhase, jumpPhase } from './jump';
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
  moveXPhase,
  moveYPhase,
  dragPhase,
  bandPhase,
  landingPhase,
  gracePhase,
  timersPhase,
];

function playingStep(state: SimState, input: InputFrame, ctx: StepCtx): SimState {
  const start: Work = { player: state.player, events: [], vxOld: state.player.vx, jumped: false, dy: 0, dxMoved: 0 };
  const done = PHASES.reduce((w, phase) => phase(w, ctx), start);
  const { work, outcome } = outcomePhase(done, ctx.level, ctx.params);
  const next = state.step + 1;
  return {
    step: next,
    status: outcome ?? 'playing',
    wonAtStep: outcome === 'won' ? next : null,
    respawnInSteps: outcome === 'dead' ? ctx.params.deathFreezeSteps : 0,
    player: work.player,
    twin: state.twin,
    prevInput: recordInput(input),
    dirPriority: ctx.dirPriority,
    events: work.events,
  };
}

export function step(state: SimState, input: InputFrame, level: Level, params: SimParams): SimState {
  if (state.status === 'won') return { ...state, player: { ...state.player }, prevInput: recordInput(input), events: [] };
  if (state.status !== 'playing') return frozenStep(state, input, level, params);
  const pressed = pressEdges(input, state.prevInput);
  if (pressed.restart) return restartState(state, input);
  const dirPriority = nextPriority(state.dirPriority, pressed);
  const ctx: StepCtx = {
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
