import { describe, expect, it } from 'vitest';
import {
  EMPTY_INPUT,
  type InputFrame,
  type InputRun,
  type Level,
  type SimApi,
  type SimParams,
  type SimState,
  type Solution,
} from '../types';
import { runInputLog, verifySolution } from './index';
import { MAX_REPLAY_STEPS } from './limits';

/**
 * A tiny fake sim (the level lane never imports the real one). The player
 * "wins" after `level.width` consecutive-or-not steps with right held in the
 * current run; the restart button starts a fresh run (step back to 0).
 */
function freshState(prevInput: InputFrame): SimState {
  return {
    step: 0,
    status: 'playing',
    wonAtStep: null,
    respawnInSteps: 0,
    player: {
      x: 0,
      y: 1,
      vx: 0,
      vy: 0,
      gear: 1,
      band: 0,
      facing: 1,
      moveDir: 0,
      grounded: true,
      coyoteSteps: 0,
      jumpBufferSteps: 0,
      shiftBufferSteps: 0,
      shiftBufferNet: 0,
      graceSteps: 0,
      graceBand: null,
      airDistance: 0,
      home: false,
    },
    twin: null,
    prevInput,
    dirPriority: 0,
    events: [],
  };
}

interface Calls {
  creates: number;
  steps: number;
}

function makeFakeSim(calls: Calls = { creates: 0, steps: 0 }): SimApi {
  return {
    createSim: () => {
      calls.creates += 1;
      return freshState(EMPTY_INPUT);
    },
    step: (state, input, level) => {
      calls.steps += 1;
      if (state.status === 'won') return { ...state, prevInput: input, events: [] };
      if (input.restart) return freshState(input);
      const x = state.player.x + (input.right ? 1 : 0);
      const won = x >= level.width;
      return {
        ...state,
        step: state.step + 1,
        status: won ? 'won' : 'playing',
        wonAtStep: won ? state.step + 1 : null,
        player: { ...state.player, x },
        prevInput: input,
        events: won ? [{ type: 'won' }] : [],
      };
    },
  };
}

const LEVEL: Level = {
  meta: { id: 'w0-01', title: 'Fake', world: 0, teaches: 'nothing', version: 1 },
  width: 5,
  height: 1,
  tiles: Array.from({ length: 5 }, () => ({ kind: 'empty' as const })),
  start: { col: 0, row: 0 },
  twinStart: null,
};
const PARAMS = {} as unknown as SimParams;
const R: InputFrame = { ...EMPTY_INPUT, right: true };
const RESTART: InputFrame = { ...EMPTY_INPUT, restart: true };

const repeat = (frame: InputFrame, n: number): InputFrame[] => Array.from({ length: n }, () => frame);

function solutionOf(frames: readonly InputFrame[], overrides: Partial<Solution> = {}): Solution {
  const runs: InputRun[] = [];
  for (const frame of frames) {
    const last = runs[runs.length - 1];
    if (last && JSON.stringify(last.frame) === JSON.stringify(frame)) runs[runs.length - 1] = { ...last, count: last.count + 1 };
    else runs.push({ count: 1, frame });
  }
  return { levelId: 'w0-01', levelVersion: 1, steps: frames.length, runs, ...overrides };
}

describe('runInputLog', () => {
  it('returns the fresh state and no states for no frames', () => {
    const calls = { creates: 0, steps: 0 };
    const result = runInputLog(makeFakeSim(calls), LEVEL, PARAMS, []);
    expect(result.states).toEqual([]);
    expect(result.final).toEqual(freshState(EMPTY_INPUT));
    expect(calls).toEqual({ creates: 1, steps: 0 });
  });

  it('records the state after every frame and ends on the last one', () => {
    const calls = { creates: 0, steps: 0 };
    const result = runInputLog(makeFakeSim(calls), LEVEL, PARAMS, [R, R, EMPTY_INPUT]);
    expect(result.states).toHaveLength(3);
    expect(result.states.map((s) => s.player.x)).toEqual([1, 2, 2]);
    expect(result.final).toBe(result.states[2]);
    expect(calls).toEqual({ creates: 1, steps: 3 });
  });

  it('passes level, params and frames through to the sim unchanged', () => {
    const seen: unknown[] = [];
    const sim: SimApi = {
      createSim: (level, params) => {
        seen.push(level, params);
        return freshState(EMPTY_INPUT);
      },
      step: (state, input, level, params) => {
        seen.push(input, level, params);
        return state;
      },
    };
    runInputLog(sim, LEVEL, PARAMS, [R]);
    expect(seen).toEqual([LEVEL, PARAMS, R, LEVEL, PARAMS]);
    expect(seen[0]).toBe(LEVEL);
    expect(seen[1]).toBe(PARAMS);
    expect(seen[2]).toBe(R);
  });

  it('is deterministic and does not mutate the frames', () => {
    const frames = [R, R, RESTART, R];
    const copy = [...frames];
    const a = runInputLog(makeFakeSim(), LEVEL, PARAMS, frames);
    const b = runInputLog(makeFakeSim(), LEVEL, PARAMS, frames);
    expect(a).toEqual(b);
    expect(frames).toEqual(copy);
  });

  it('refuses a log longer than the step cap before stepping at all', () => {
    const calls = { creates: 0, steps: 0 };
    const frames = repeat(EMPTY_INPUT, MAX_REPLAY_STEPS + 1);
    expect(() => runInputLog(makeFakeSim(calls), LEVEL, PARAMS, frames)).toThrow(RangeError);
    expect(calls.steps).toBe(0);
  });
});

describe('verifySolution', () => {
  const sim = makeFakeSim();

  it('passes when the replay wins exactly on the last step', () => {
    expect(verifySolution(sim, LEVEL, PARAMS, solutionOf(repeat(R, 5)))).toEqual([]);
  });

  it('passes when a restart makes wonAtStep smaller than steps', () => {
    const frames = [...repeat(R, 2), RESTART, ...repeat(R, 5)];
    const solution = solutionOf(frames);
    expect(solution.steps).toBe(8);
    expect(verifySolution(sim, LEVEL, PARAMS, solution)).toEqual([]);
  });

  it('passes when the recording runs past the winning step (wonAtStep <= steps)', () => {
    expect(verifySolution(sim, LEVEL, PARAMS, solutionOf([...repeat(R, 5), ...repeat(EMPTY_INPUT, 3)]))).toEqual([]);
  });

  it('fails when the player never reaches the exit', () => {
    const e = verifySolution(sim, LEVEL, PARAMS, solutionOf(repeat(R, 3)));
    expect(e).toEqual(["w0-01: replay did not win: status 'playing' after 3 steps (feet at x=3.00, y=1.00)"]);
  });

  it('fails a solution that restarts at the end', () => {
    const e = verifySolution(sim, LEVEL, PARAMS, solutionOf([...repeat(R, 4), RESTART]));
    expect(e[0]).toContain("status 'playing' after 5 steps");
  });

  it('rejects a solution for a different level version', () => {
    const e = verifySolution(sim, { ...LEVEL, meta: { ...LEVEL.meta, version: 2 } }, PARAMS, solutionOf(repeat(R, 5)));
    expect(e).toEqual(['w0-01: solution is for level version 1 but the level is version 2 (re-record it after editing the level)']);
  });

  it('rejects a solution for a different level id', () => {
    const e = verifySolution(sim, LEVEL, PARAMS, solutionOf(repeat(R, 5), { levelId: 'w0-02' }));
    expect(e).toEqual(["w0-01: this solution belongs to level 'w0-02'"]);
  });

  it('rejects a steps header that disagrees with the runs', () => {
    const e = verifySolution(sim, LEVEL, PARAMS, solutionOf(repeat(R, 5), { steps: 4 }));
    expect(e).toEqual(['w0-01: steps (4) does not equal the sum of the run counts (5)']);
  });

  it('rejects an invalid run count without replaying', () => {
    const bad: Solution = { levelId: 'w0-01', levelVersion: 1, steps: 0, runs: [{ count: 0, frame: R }] };
    const e = verifySolution(sim, LEVEL, PARAMS, bad);
    expect(e).toEqual(['w0-01: run 1 has an invalid count (0)']);
  });

  it('rejects a solution over the step cap without expanding it', () => {
    const calls = { creates: 0, steps: 0 };
    const big: Solution = {
      levelId: 'w0-01',
      levelVersion: 1,
      steps: MAX_REPLAY_STEPS + 1,
      runs: [{ count: MAX_REPLAY_STEPS + 1, frame: R }],
    };
    const e = verifySolution(makeFakeSim(calls), LEVEL, PARAMS, big);
    expect(e).toEqual([`w0-01: solution has ${MAX_REPLAY_STEPS + 1} steps; the replay limit is ${MAX_REPLAY_STEPS}`]);
    expect(calls).toEqual({ creates: 0, steps: 0 });
  });

  it('reports a sim that throws instead of crashing the test run', () => {
    const boom: SimApi = {
      createSim: () => freshState(EMPTY_INPUT),
      step: () => {
        throw new Error('boom');
      },
    };
    expect(verifySolution(boom, LEVEL, PARAMS, solutionOf(repeat(R, 2)))).toEqual(['w0-01: the sim threw during replay: boom']);
  });

  it('reports a thrown non-Error value too', () => {
    const odd: SimApi = {
      createSim: () => freshState(EMPTY_INPUT),
      step: () => {
        throw 'plain text';
      },
    };
    expect(verifySolution(odd, LEVEL, PARAMS, solutionOf(repeat(R, 1)))).toEqual(['w0-01: the sim threw during replay: plain text']);
  });

  it('fails a sim that reports won without a wonAtStep', () => {
    const odd: SimApi = {
      createSim: () => freshState(EMPTY_INPUT),
      step: (s) => ({ ...s, status: 'won', wonAtStep: null }),
    };
    expect(verifySolution(odd, LEVEL, PARAMS, solutionOf(repeat(R, 1)))).toEqual(['w0-01: replay reported won without a wonAtStep']);
  });

  it('fails a sim whose wonAtStep exceeds the recording length', () => {
    const odd: SimApi = {
      createSim: () => freshState(EMPTY_INPUT),
      step: (s) => ({ ...s, status: 'won', wonAtStep: 99 }),
    };
    expect(verifySolution(odd, LEVEL, PARAMS, solutionOf(repeat(R, 2)))).toEqual([
      'w0-01: replay won at step 99 but the solution has only 2 steps',
    ]);
  });

  it('is deterministic: replaying twice gives the same verdict', () => {
    const solution = solutionOf([...repeat(R, 2), RESTART, ...repeat(R, 5)]);
    expect(verifySolution(sim, LEVEL, PARAMS, solution)).toEqual(verifySolution(sim, LEVEL, PARAMS, solution));
  });
});

describe('verifySolution on long solutions (review L1)', () => {
  const LONG = MAX_REPLAY_STEPS;
  const NEVER_WINS: Level = { ...LEVEL, width: LONG * 2 };
  const BALLAST_NUMBERS = 16;

  /** Heap in use, read through globalThis because browser-side tsconfig has no Node types (tests run in Node). */
  const heapUsed = (): number =>
    (globalThis as unknown as { process: { memoryUsage: () => { heapUsed: number } } }).process.memoryUsage().heapUsed;

  /** A solution of `count` steps built directly as one run (solutionOf would compare a million frames as JSON). */
  const oneRun = (frame: InputFrame, count: number): Solution => ({
    levelId: 'w0-01',
    levelVersion: 1,
    steps: count,
    runs: [{ count, frame }],
  });

  /** Fake sim whose every state carries ~0.3 KB, so retaining 1,000,000 of them would cost about 300 MB. */
  function makeHeavySim(onStep: (n: number) => void): SimApi {
    let n = 0;
    return {
      createSim: () => freshState(EMPTY_INPUT),
      step: (state, input) => {
        n += 1;
        onStep(n);
        const heavy = { ...state, step: state.step + 1, prevInput: input, events: [] };
        (heavy as unknown as { ballast: number[] }).ballast = new Array<number>(BALLAST_NUMBERS).fill(n);
        return heavy;
      },
    };
  }

  const EXTRA = 100_000;

  it('stops stepping at the first won state instead of replaying the whole recording', () => {
    const calls = { creates: 0, steps: 0 };
    const solution: Solution = {
      levelId: 'w0-01',
      levelVersion: 1,
      steps: 5 + EXTRA,
      runs: [
        { count: 5, frame: R },
        { count: EXTRA, frame: EMPTY_INPUT },
      ],
    };
    expect(verifySolution(makeFakeSim(calls), LEVEL, PARAMS, solution)).toEqual([]);
    expect(calls).toEqual({ creates: 1, steps: 5 });
  });

  it('runs to the step limit and reports a non-win when the recording never wins', () => {
    const calls = { creates: 0, steps: 0 };
    const e = verifySolution(makeFakeSim(calls), NEVER_WINS, PARAMS, oneRun(R, LONG));
    expect(calls.steps).toBe(LONG);
    expect(e).toHaveLength(1);
    expect(e[0]).toContain(`status 'playing' after ${LONG} steps`);
  });

  it('does not retain intermediate states while replaying a 1,000,000-step solution', () => {
    let baseline = 0;
    let peakDelta = 0;
    const sim = makeHeavySim((n) => {
      if (n === 1) baseline = heapUsed();
      if (n % 50_000 === 0) peakDelta = Math.max(peakDelta, heapUsed() - baseline);
    });
    const e = verifySolution(sim, NEVER_WINS, PARAMS, oneRun(R, LONG));
    expect(e).toHaveLength(1);
    // Keeping every state would add about 300 MB; one state at a time stays far below this.
    expect(peakDelta).toBeLessThan(60 * 1024 * 1024);
  });
});
