import { describe, expect, it } from 'vitest';
import { createSim, EMPTY_INPUT, formatSolution, type InputFrame, type Solution } from '../core';
import { loadGameParams } from './params';
import {
  chooseFrameSource,
  clampReplaySpeed,
  findSolutionText,
  MAX_REPLAY_SPEED,
  parseReplayRequest,
  ReplayFeed,
} from './replay';
import { RunDriver } from './runDriver';
import { gridLevel } from './testkit';

const { params } = loadGameParams();
const level = gridLevel(['.....', '.@.E.', '#####']);
const id = level.meta.id;
const right: InputFrame = { ...EMPTY_INPUT, right: true };
const STEP_MS = 1000 / 60;

function solutionText(steps: number, levelVersion = 1): string {
  const solution: Solution = { levelId: id, levelVersion, steps, runs: [{ count: steps, frame: right }] };
  return formatSolution(solution);
}

const files = (text: string): Record<string, string> => ({ [`/levels/${id}.solution.txt`]: text });

describe('clampReplaySpeed', () => {
  it.each([
    ['1', 1],
    ['10', 10],
    ['60', 60],
    ['0', 1],
    ['-5', 1],
    ['61', 60],
    ['100000', MAX_REPLAY_SPEED],
    ['7.9', 7],
  ])('%s -> %i', (raw, expected) => {
    expect(clampReplaySpeed(raw)).toBe(expected);
  });

  it.each([[null], [undefined], [''], ['  '], ['fast'], ['NaN'], ['Infinity']])('%s means no override', (raw) => {
    expect(clampReplaySpeed(raw)).toBeNull();
  });
});

describe('parseReplayRequest', () => {
  it('is inactive without replay=1', () => {
    expect(parseReplayRequest('')).toEqual({ active: false, speed: null });
    expect(parseReplayRequest('?level=w0-02')).toEqual({ active: false, speed: null });
    expect(parseReplayRequest('?replay=0')).toEqual({ active: false, speed: null });
  });

  it('is active with replay=1 and reads the speed', () => {
    expect(parseReplayRequest('?level=w0-02&replay=1')).toEqual({ active: true, speed: null });
    expect(parseReplayRequest('?replay=1&speed=30')).toEqual({ active: true, speed: 30 });
    expect(parseReplayRequest('?replay=1&speed=999')).toEqual({ active: true, speed: 60 });
  });

  it('ignores speed when not replaying', () => {
    expect(parseReplayRequest('?speed=30')).toEqual({ active: false, speed: null });
  });
});

describe('findSolutionText', () => {
  it('matches by file name under any prefix', () => {
    expect(findSolutionText({ '/levels/w0-02.solution.txt': 'a' }, 'w0-02')).toBe('a');
    expect(findSolutionText({ 'w0-02.solution.txt': 'b' }, 'w0-02')).toBe('b');
  });

  it('does not match a different level whose name ends the same', () => {
    expect(findSolutionText({ '/levels/xw0-02.solution.txt': 'a' }, 'w0-02')).toBeNull();
    expect(findSolutionText({}, 'w0-02')).toBeNull();
  });
});

describe('chooseFrameSource', () => {
  it('is live unless the URL asks for a replay', () => {
    expect(chooseFrameSource('?level=w0-98', level, files(solutionText(5))).kind).toBe('live');
  });

  it('builds a feed with one frame per recorded step', () => {
    const src = chooseFrameSource('?replay=1&speed=20', level, files(solutionText(12)));
    if (src.kind !== 'replay') throw new Error(`expected replay, got ${src.kind}`);
    expect(src.feed.frames).toHaveLength(12);
    expect(src.speed).toBe(20);
  });

  it('reports a missing solution as an error', () => {
    const src = chooseFrameSource('?replay=1', level, {});
    expect(src.kind).toBe('error');
    expect(src.kind === 'error' && src.message).toContain(`${id}.solution.txt`);
  });

  it('reports an unparsable solution as an error with the parser messages', () => {
    const src = chooseFrameSource('?replay=1', level, files('this is not a solution'));
    expect(src.kind).toBe('error');
    expect(src.kind === 'error' && src.message).toContain('failed to parse');
  });

  it('reports a solution for another level version', () => {
    const src = chooseFrameSource('?replay=1', level, files(solutionText(5, 7)));
    expect(src.kind === 'error' && src.message).toContain('version 7');
  });
});

describe('ReplayFeed', () => {
  const frames: InputFrame[] = [right, { ...right, jump: true }, EMPTY_INPUT];
  const fresh = createSim(level, params);

  it('hands out frames in order, then null', () => {
    const feed = new ReplayFeed(frames);
    expect([feed.next(fresh), feed.next(fresh), feed.next(fresh), feed.next(fresh)]).toEqual([...frames, null]);
    expect(feed.consumed).toBe(3);
  });

  it('is done when the frames run out, not before', () => {
    const feed = new ReplayFeed(frames);
    feed.next(fresh);
    feed.next(fresh);
    expect(feed.isDone(fresh)).toBe(false);
    feed.next(fresh);
    expect(feed.isDone(fresh)).toBe(true);
  });

  it('is done as soon as the sim has won, with frames left over', () => {
    const feed = new ReplayFeed(frames);
    const won = { ...fresh, status: 'won' as const, wonAtStep: 1 };
    expect(feed.isDone(won)).toBe(true);
    expect(feed.next(won)).toBeNull();
  });

  it('keeps feeding through a death (recordings include them)', () => {
    const feed = new ReplayFeed(frames);
    expect(feed.next({ ...fresh, status: 'dead' })).toBe(right);
  });

  it('rewinds to frame 0', () => {
    const feed = new ReplayFeed(frames);
    feed.next(fresh);
    feed.next(fresh);
    feed.rewind();
    expect(feed.consumed).toBe(0);
    expect(feed.next(fresh)).toBe(right);
  });

  it('sees a restart press once per press', () => {
    const feed = new ReplayFeed(frames);
    expect([false, true, true, false, true].map((h) => feed.restartPressed(h))).toEqual([false, true, false, false, true]);
  });
});

/** Drive a replay the way the scene does; returns the driver at the end. */
function replayAt(feed: ReplayFeed, drive: (d: RunDriver, source: () => InputFrame | null) => void): RunDriver {
  const driver = new RunDriver(level, params);
  drive(driver, () => feed.next(driver.state));
  return driver;
}

describe('replay through RunDriver', () => {
  const winFrames = Array.from({ length: 400 }, () => right);

  it('reaches the same final state at any speed or frame rate', () => {
    const results = [
      replayAt(new ReplayFeed(winFrames), (d, src) => {
        for (let i = 0; i < 1000; i += 1) d.advance(STEP_MS, src);
      }),
      replayAt(new ReplayFeed(winFrames), (d, src) => {
        for (let i = 0; i < 100; i += 1) d.advance(50, src); // 20 fps, 3 steps a frame
      }),
      replayAt(new ReplayFeed(winFrames), (d, src) => {
        for (let i = 0; i < 20; i += 1) d.advanceFixed(60, src);
      }),
      replayAt(new ReplayFeed(winFrames), (d, src) => {
        for (let i = 0; i < 400; i += 1) d.advanceFixed(1, src);
      }),
    ];
    const [first, ...rest] = results;
    expect(first?.state.status).toBe('won');
    for (const r of rest) expect(r.state).toEqual(first?.state);
  });

  it('runs exactly one frame per step: frame N on sim step N', () => {
    const feed = new ReplayFeed(winFrames);
    const driver = replayAt(feed, (d, src) => d.advanceFixed(10, src));
    expect(driver.state.step).toBe(10);
    expect(feed.consumed).toBe(10);
  });

  it('stops stepping once done and shows the final state unblended', () => {
    const feed = new ReplayFeed(winFrames);
    const driver = replayAt(feed, (d, src) => {
      for (let i = 0; i < 1000; i += 1) d.advance(STEP_MS * 0.7, src);
    });
    const wonAt = driver.state.wonAtStep;
    driver.advance(STEP_MS * 5, () => feed.next(driver.state));
    expect(driver.state.wonAtStep).toBe(wonAt);
    expect(driver.alpha).toBe(1);
    expect(feed.isDone(driver.state)).toBe(true);
  });

  it('finishes when the frames run out before a win', () => {
    const feed = new ReplayFeed([EMPTY_INPUT, EMPTY_INPUT, EMPTY_INPUT]);
    const driver = replayAt(feed, (d, src) => d.advanceFixed(60, src));
    expect(driver.state.status).toBe('playing');
    expect(driver.state.step).toBe(3);
    expect(feed.isDone(driver.state)).toBe(true);
  });
});
