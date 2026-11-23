/**
 * Timing robustness (M1-44, GDD §1 "Fair: the solution never needs
 * pixel-perfect input"): every shipped recording still wins when any single
 * input transition happens up to MAX_SHIFT_STEPS steps earlier or later.
 *
 * A transition is a step where the held buttons change. Shifting it by d moves
 * that change d steps; a neighbouring transition it would cross is pushed along
 * so every run keeps at least one step (so a 1-step tap moves as a whole). The
 * last run is held TAIL_SECONDS longer so that a shifted recording is not failed
 * only because it ends a few steps before the exit (a shifted gear change can
 * cost more than the shift itself in arrival time); a body that is stuck,
 * dead or lost stays lost however long the tail is. Levels without a parsable
 * recording are the solvability test's job and are skipped here. In a level
 * with checkpoint posts a trial fails at its first `died` event: a post respawn
 * must not rescue a perturbed run. Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import {
  encodeRuns,
  expandRuns,
  loadLevels,
  parseSolution,
  verifySolution,
  type InputFrame,
  type InputRun,
  type Level,
  type SimApi,
  type SimParams,
  type SimState,
  type Solution,
} from '../../src/core';
import { levels, params, sim, solutions } from './shipped';

/** Per level: dozens of replays of several hundred steps; generous under coverage on a loaded machine. */
const LEVEL_TIMEOUT_MS = 30_000;

/** Board M1-44 / level-plan.md: a recording must tolerate +-3 steps on every transition. */
const MAX_SHIFT_STEPS = 3;

/** Extra hold of the last run, in seconds of sim time. */
const TAIL_SECONDS = 1;

const OFFSETS: readonly number[] = Array.from({ length: 2 * MAX_SHIFT_STEPS + 1 }, (_, i) => i - MAX_SHIFT_STEPS).filter(
  (d) => d !== 0,
);

/** Step index of each transition: the end of every run but the last. */
function boundaries(counts: readonly number[]): number[] {
  const ends: number[] = [];
  counts.slice(0, -1).reduce((at, c) => {
    ends.push(at + c);
    return at + c;
  }, 0);
  return ends;
}

/** Moves boundary k by d, pushing neighbours so runs stay >= 1 step; null if it would leave the recording. */
function shiftBoundary(counts: readonly number[], k: number, d: number): number[] | null {
  const total = counts.reduce((a, b) => a + b, 0);
  const b = boundaries(counts);
  b[k] = (b[k] ?? 0) + d;
  for (let j = k + 1; j < b.length; j++) b[j] = Math.max(b[j] ?? 0, (b[j - 1] ?? 0) + 1);
  for (let j = k - 1; j >= 0; j--) b[j] = Math.min(b[j] ?? 0, (b[j + 1] ?? 0) - 1);
  if ((b[0] ?? 1) < 1 || (b[b.length - 1] ?? 0) > total - 1) return null;
  return [...b, total].map((end, i) => end - (i === 0 ? 0 : (b[i - 1] ?? 0)));
}

/** The recording's runs, merged, with the last run held TAIL_SECONDS longer. */
function paddedRuns(solution: Solution, stepHz: number): InputRun[] {
  const runs = [...encodeRuns(expandRuns(solution.runs))];
  const last = runs[runs.length - 1];
  if (last !== undefined) runs[runs.length - 1] = { ...last, count: last.count + TAIL_SECONDS * stepHz };
  return runs;
}

/** One frame per step; frames of a run share the run's frame object, so two expansions compare by reference. */
function framesOf(runs: readonly InputRun[], counts: readonly number[]): InputFrame[] {
  return runs.flatMap((r, i) => Array.from({ length: counts[i] ?? r.count }, () => r.frame));
}

/** states[i] = the state before frame i (states[0] is the fresh level). */
function prefixStates(api: SimApi, level: Level, p: SimParams, frames: readonly InputFrame[]): SimState[] {
  const states = [api.createSim(level, p)];
  for (const frame of frames) states.push(api.step(states[states.length - 1] as SimState, frame, level, p));
  return states;
}

/** Why the shifted frames do not win, or null. Replays only from the first frame that differs from the original. */
function trialProblem(api: SimApi, level: Level, p: SimParams, base: Replayed, trial: readonly InputFrame[]): string | null {
  let i = trial.findIndex((frame, k) => frame !== base.frames[k]);
  if (i < 0) i = trial.length;
  let state = base.states[i] as SimState;
  const posts = (level.checkpoints?.length ?? 0) > 0;
  for (; i < trial.length && state.status !== 'won'; i++) {
    state = api.step(state, trial[i] as InputFrame, level, p);
    // A post respawn must never rescue a perturbed run (level-format.md §2 "Checkpoint headers").
    if (posts && state.events.some((e) => e.type === 'died')) return `died at step ${i + 1} in a level with posts`;
  }
  if (state.status === 'won') return null;
  const { x, y } = state.player;
  return `did not win: status '${state.status}' after ${trial.length} steps (feet at x=${x.toFixed(2)}, y=${y.toFixed(2)})`;
}

interface Replayed {
  readonly frames: readonly InputFrame[];
  readonly states: readonly SimState[];
}

/** "transition at step S shifted by d: <why>" for every shifted recording that does not win. */
function timingProblems(api: SimApi, level: Level, p: SimParams, solution: Solution): string[] {
  const runs = paddedRuns(solution, p.stepHz);
  const counts = runs.map((r) => r.count);
  const frames = framesOf(runs, counts);
  const base: Replayed = { frames, states: prefixStates(api, level, p, frames) };
  const problems: string[] = [];
  boundaries(counts).forEach((step, k) => {
    for (const d of OFFSETS) {
      const shifted = shiftBoundary(counts, k, d);
      const why = shifted === null ? null : trialProblem(api, level, p, base, framesOf(runs, shifted));
      if (why !== null) problems.push(`transition at step ${step} shifted by ${d > 0 ? '+' : ''}${d}: ${why}`);
    }
  });
  return problems;
}

function recordingOf(level: Level): Solution | null {
  const text = solutions.get(level.meta.id);
  if (text === undefined) return null;
  const parsed = parseSolution(text, `${level.meta.id}.solution`);
  return parsed.ok ? parsed.value : null;
}

describe(`timing robustness: every transition shifted by up to +-${MAX_SHIFT_STEPS} steps still wins`, () => {
  for (const level of levels) {
    const solution = recordingOf(level);
    it.runIf(solution !== null)(`${level.meta.id}`, () => {
      expect(timingProblems(sim, level, params, solution as Solution)).toEqual([]);
    }, LEVEL_TIMEOUT_MS);
  }
});

describe('robustness harness self-check', () => {
  it('shifts one boundary and pushes the neighbours it would cross', () => {
    expect(shiftBoundary([10, 1, 1, 10], 0, 3)).toEqual([13, 1, 1, 7]);
    expect(shiftBoundary([10, 1, 1, 10], 2, -3)).toEqual([7, 1, 1, 13]);
    expect(shiftBoundary([10, 5], 0, -2)).toEqual([8, 7]);
    expect(shiftBoundary([2, 5], 0, -3)).toBeNull();
    expect(shiftBoundary([5, 2], 0, 3)).toBeNull();
  });

  // Walk right, let go over a 1-tile shaft and drop to the exit. The box (0.75
  // tiles) only fits the shaft while its centre is within 0.125 tiles of the
  // middle, about 5 steps at walking pace, so a recording that lets go exactly
  // at the earliest step is flagged; one that keeps walking over the shaft is not.
  const FIXTURE = ['id: w0-91', 'title: fixture', 'world: 0', 'teaches: robustness self-check', 'version: 1', '---'];
  const grid = ['..........', '.@........', '#####.####', '#####.####', '#####E####', '##########'];
  const fixture = loadLevels({ '/fixture/w0-91.txt': [...FIXTURE, ...grid].join('\n') });
  const level = fixture.ok ? fixture.value[0] : undefined;
  const right = { left: false, right: true, jump: false, shiftUp: false, shiftDown: false, restart: false };
  const idle = { ...right, right: false };
  const recording = (walk: number): Solution => ({
    levelId: 'w0-91',
    levelVersion: 1,
    steps: walk + 120,
    runs: [
      { count: walk, frame: right },
      { count: 120, frame: idle },
    ],
  });
  const wins = (walk: number): boolean => level !== undefined && verifySolution(sim, level, params, recording(walk)).length === 0;

  it('loads the fixture', () => {
    expect(fixture.ok ? [] : fixture.errors).toEqual([]);
  });

  it.runIf(level !== undefined)('flags a recording that only wins with exact timing', () => {
    const fx = level as Level;
    const earliest = Array.from({ length: 200 }, (_, n) => n + 1).find(wins);
    expect(earliest).toBeDefined();
    const exact = earliest as number;
    expect(wins(exact - 1)).toBe(false);
    expect(timingProblems(sim, fx, params, recording(exact)).join('\n')).toContain(`shifted by -${MAX_SHIFT_STEPS}`);
    expect(timingProblems(sim, fx, params, recording(exact + MAX_SHIFT_STEPS + 1))).toEqual([]);
  });
});

describe('robustness harness self-check: levels with posts', () => {
  // Walk right past a post at col 21, over a blue strip (cols 25-28) to the exit. Letting go on the strip
  // drops the body through it. With the post, the trial dies and a post respawn would carry it on to a win.
  const HEAD = ['title: fixture', 'world: 0', 'teaches: robustness posts self-check', 'version: 1'];
  const GRID = ['.'.repeat(34), '.@' + '.'.repeat(29) + 'E..', '#'.repeat(25) + 'BBBB' + '#'.repeat(5)];
  const load = (id: string, extra: readonly string[]): Level | undefined => {
    const r = loadLevels({ [`/fixture/${id}.txt`]: [`id: ${id}`, ...HEAD, ...extra, '---', ...GRID].join('\n') });
    return r.ok ? r.value[0] : undefined;
  };
  const withPost = load('w0-92', ['checkpoint: 21 1']);
  const noPost = load('w0-93', []);
  const right: InputFrame = { left: false, right: true, jump: false, shiftUp: false, shiftDown: false, restart: false };
  const idle: InputFrame = { ...right, right: false };
  const base = (level: Level): Replayed => {
    const frames = Array.from({ length: 2000 }, () => right);
    return { frames, states: prefixStates(sim, level, params, frames) };
  };
  /** Right, but let go for 40 steps once the body is over the strip. */
  const letGoOnStrip = (b: Replayed): InputFrame[] => {
    const at = b.states.findIndex((s) => s.player.x > 26);
    return b.frames.map((f, k) => (k >= at && k < at + 40 ? idle : f));
  };

  it('loads both fixtures', () => {
    expect([withPost, noPost].every((l) => l !== undefined)).toBe(true);
  });

  it.runIf(withPost !== undefined && noPost !== undefined)('a trial that dies fails in a post level, and only there', () => {
    const plain = base(noPost as Level);
    const trialPlain = letGoOnStrip(plain);
    expect(prefixStates(sim, noPost as Level, params, trialPlain).some((s) => s.events.some((e) => e.type === 'died'))).toBe(true);
    expect(trialProblem(sim, noPost as Level, params, plain, trialPlain)).toBeNull();
    const posted = base(withPost as Level);
    expect(trialProblem(sim, withPost as Level, params, posted, posted.frames)).toBeNull();
    expect(trialProblem(sim, withPost as Level, params, posted, letGoOnStrip(posted))).toMatch(/^died at step \d+ in a level with posts$/);
  });
});
