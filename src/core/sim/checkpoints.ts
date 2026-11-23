/**
 * Checkpoint posts in the sim (contracts/checkpoints.ts, architecture.md 3.7).
 * Levels without `checkpoints` never carry `SimState.checkpoint`, so every
 * function here is a no-op for them and the old code path is bit-identical.
 */
import { SIM_EPSILON, type CheckpointState, type InputFrame, type Level, type PlayerState, type SimParams, type SimState } from '../types';
import { createSim, spawnBody } from './create';
import { recordInput } from './input';

/** Kinetic clock of a state: step - kinBase, or step when no post is lit. The `t` of every mover, bolt and sweep. */
export function kineticStep(state: SimState): number {
  return state.checkpoint ? state.step - state.checkpoint.kinBase : state.step;
}

/** The post lit by a body whose box is at `p` (highest index wins, forward only), or the current one. */
export function litCheckpoint(level: Level, params: SimParams, p: PlayerState, current: CheckpointState | undefined): CheckpointState | undefined {
  const posts = level.checkpoints;
  if (!posts || p.home) return current;
  const reach = params.playerWidth / 2 + 0.5 - SIM_EPSILON;
  let best = current?.index ?? -1;
  posts.forEach((post, i) => {
    if (i > best && Math.abs(p.x - (post.cell.col + 0.5)) < reach) best = i;
  });
  if (best === (current?.index ?? -1)) return current;
  return { index: best, kinBase: current?.kinBase ?? 0 };
}

/** A frozen death step with a post lit: the level clock runs on, the kinetic clock stands still. */
export function tickFrozen(state: SimState): Pick<SimState, 'step'> & Partial<Pick<SimState, 'checkpoint'>> {
  if (!state.checkpoint) return { step: state.step };
  return { step: state.step + 1, checkpoint: { ...state.checkpoint, kinBase: state.checkpoint.kinBase + 1 } };
}

/** The respawn step after a death with a post lit: a fresh spawn at the post, kinetic clock = post.clock. */
export function postRespawn(state: SimState, input: InputFrame, level: Level, params: SimParams, lit: CheckpointState): SimState {
  const post = level.checkpoints?.[lit.index];
  if (!post) return { ...createSim(level, params), prevInput: recordInput(input) };
  const step = state.step + 1;
  return {
    ...createSim(level, params),
    step,
    player: spawnBody(post.cell, level, params),
    prevInput: recordInput(input),
    checkpoint: { index: lit.index, kinBase: step - post.clock },
  };
}
