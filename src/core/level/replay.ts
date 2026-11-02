/**
 * Replay: drive an injected sim through an input log, and the solvability
 * check built on it (docs/tech/level-format.md section 4, "Pass criteria").
 * The level lane never imports the sim, so the sim comes in as `SimApi`.
 */
import type { InputLogRun, RunInputLogFn, SimState, VerifySolutionFn } from '../types';
import { expandRuns } from './codec';
import { MAX_REPLAY_STEPS } from './limits';

export const runInputLog: RunInputLogFn = (sim, level, params, frames) => {
  if (frames.length > MAX_REPLAY_STEPS) {
    throw new RangeError(`input log has ${frames.length} frames; the replay limit is ${MAX_REPLAY_STEPS}`);
  }
  const fresh = sim.createSim(level, params);
  const states: SimState[] = [];
  let state = fresh;
  for (const frame of frames) {
    state = sim.step(state, frame, level, params);
    states.push(state);
  }
  return { final: state, states } satisfies InputLogRun;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Problems that make replaying pointless: wrong level, wrong version, inconsistent counts, too long. */
function structureErrors(id: string, versionWanted: number, solution: Parameters<VerifySolutionFn>[3]): readonly string[] {
  if (solution.levelId !== id) return [`${id}: this solution belongs to level '${solution.levelId}'`];
  if (solution.levelVersion !== versionWanted) {
    return [`${id}: solution is for level version ${solution.levelVersion} but the level is version ${versionWanted} (re-record it after editing the level)`];
  }
  const bad = solution.runs.findIndex((r) => !Number.isSafeInteger(r.count) || r.count < 1);
  if (bad >= 0) return [`${id}: run ${bad + 1} has an invalid count (${solution.runs[bad]?.count})`];
  const total = solution.runs.reduce((sum, r) => sum + r.count, 0);
  if (total > MAX_REPLAY_STEPS || solution.steps > MAX_REPLAY_STEPS) {
    return [`${id}: solution has ${Math.max(total, solution.steps)} steps; the replay limit is ${MAX_REPLAY_STEPS}`];
  }
  if (total !== solution.steps) return [`${id}: steps (${solution.steps}) does not equal the sum of the run counts (${total})`];
  return [];
}

function outcomeErrors(id: string, final: SimState, steps: number): readonly string[] {
  if (final.status !== 'won') {
    const { x, y } = final.player;
    return [`${id}: replay did not win: status '${final.status}' after ${steps} steps (feet at x=${x.toFixed(2)}, y=${y.toFixed(2)})`];
  }
  if (final.wonAtStep === null) return [`${id}: replay reported won without a wonAtStep`];
  if (final.wonAtStep > steps) return [`${id}: replay won at step ${final.wonAtStep} but the solution has only ${steps} steps`];
  return [];
}

export const verifySolution: VerifySolutionFn = (sim, level, params, solution) => {
  const id = level.meta.id;
  const structural = structureErrors(id, level.meta.version, solution);
  if (structural.length > 0) return structural;
  try {
    const { final } = runInputLog(sim, level, params, expandRuns(solution.runs));
    return outcomeErrors(id, final, solution.steps);
  } catch (error: unknown) {
    return [`${id}: the sim threw during replay: ${messageOf(error)}`];
  }
};
