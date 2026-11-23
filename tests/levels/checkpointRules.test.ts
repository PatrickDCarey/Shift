/**
 * Shipped levels against the checkpoint and long-level rules in
 * `checkpointRules.ts`, plus a planted fixture per rule that must fail.
 * A shipped level that breaks a rule is never fixed by weakening the rule:
 * it goes in `KNOWN_FAILURES` with its request line. Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import { parseLevel, parseSolution, type InputFrame, type Level, type Solution } from '../../src/core';
import tuningJson from '../../src/data/tuning.json';
import {
  MAX_LEVEL_WIDTH,
  MAX_POST_LEVEL_ROWS,
  postRecordingProblems,
  recoveryProblems,
  respawnBoxProblems,
  sizeProblems,
} from './checkpointRules';
import type { RuleConfig } from './levelRules';
import { levels, params, sim, solutions } from './shipped';

type Rule = 'respawnBox' | 'recovery' | 'size' | 'recording';

/** `<rule>:<level id>` -> the requests.md line that asks for the fix. */
const KNOWN_FAILURES: Readonly<Record<string, string>> = {};

const cfg: RuleConfig = {
  tileSize: tuningJson.tileSize,
  playerHeightTiles: tuningJson.playerHeightTiles,
  cameraMaxApartTiles: tuningJson.cameraMaxApartTiles,
};

function recordingOf(level: Level): Solution | null {
  const text = solutions.get(level.meta.id);
  const parsed = text === undefined ? null : parseSolution(text, `${level.meta.id}.solution`);
  return parsed?.ok ? parsed.value : null; // a missing or bad recording fails solvability.test.ts
}

const CHECKS: Readonly<Record<Rule, (level: Level) => readonly string[]>> = {
  respawnBox: (level) => respawnBoxProblems(level, cfg),
  recovery: recoveryProblems,
  size: sizeProblems,
  recording: (level) => {
    const solution = recordingOf(level);
    return solution === null ? [] : postRecordingProblems(sim, level, params, solution);
  },
};

describe('checkpoint and long-level rules (shipped levels)', () => {
  it('finds levels (an empty list would pass vacuously)', () => {
    expect(levels.length).toBeGreaterThan(0);
  });

  for (const rule of Object.keys(CHECKS) as Rule[]) {
    it.each(levels.map((l) => [l.meta.id, l] as const))(`%s: ${rule}`, (_id, level) => {
      const problems = CHECKS[rule](level);
      const known = KNOWN_FAILURES[`${rule}:${level.meta.id}`];
      if (known === undefined) expect(problems).toEqual([]);
      else expect(problems, `known failure (${known}) is fixed: remove it from KNOWN_FAILURES`).not.toEqual([]);
    });
  }

  it('every KNOWN_FAILURES entry names a shipped level', () => {
    const ids = new Set(levels.map((l) => l.meta.id));
    expect(Object.keys(KNOWN_FAILURES).filter((k) => !ids.has(k.split(':')[1] ?? ''))).toEqual([]);
  });
});

describe('checkpoint rules self-check (planted levels)', () => {
  const POST = 'checkpoint: 22 6';
  // 70 x 9: post at (22, 6) on a safe floor, a blue strip at cols 30-33 over a pit, exit at (50, 6).
  const W = 70;
  const ROWS = [
    ...Array.from({ length: 6 }, () => '.'.repeat(W)),
    '.@' + '.'.repeat(48) + 'E' + '.'.repeat(W - 51),
    '#'.repeat(30) + 'BBBB' + '#'.repeat(W - 34),
    '#'.repeat(30) + '....' + '#'.repeat(W - 34),
  ];
  const level = (headers: readonly string[], rows: readonly string[] = ROWS): Level => {
    const text = ['id: w0-96', 'title: t', 'world: 0', 'teaches: t', 'version: 1', ...headers, '---', ...rows].join('\n');
    const result = parseLevel(text, 'w0-96');
    if (!result.ok) throw new Error(result.errors.join('\n'));
    return result.value;
  };
  const withCell = (row: number, col: number, c: string, rows: readonly string[] = ROWS): string[] =>
    rows.map((r, i) => (i === row ? r.slice(0, col) + c + r.slice(col + 1) : r));

  const right: InputFrame = { left: false, right: true, jump: false, shiftUp: false, shiftDown: false, restart: false };
  const idle: InputFrame = { ...right, right: false };
  /** Runs `pick(step, x)` until the level is won; the recording of exactly those frames. */
  const record = (fx: Level, pick: (k: number, x: number) => InputFrame): Solution => {
    let state = sim.createSim(fx, params);
    const runs: { count: number; frame: InputFrame }[] = [];
    for (let k = 0; k < 6000 && state.status !== 'won'; k++) {
      const frame = pick(k, state.player.x);
      state = sim.step(state, frame, fx, params);
      const last = runs[runs.length - 1];
      if (last && last.frame === frame) last.count += 1;
      else runs.push({ count: 1, frame });
    }
    const steps = runs.reduce((a, r) => a + r.count, 0);
    return { levelId: 'w0-96', levelVersion: 1, steps, runs };
  };

  it('passes the fixture on every rule', () => {
    const fx = level([POST]);
    const rec = record(fx, () => right);
    const all = [respawnBoxProblems(fx, cfg), recoveryProblems(fx), sizeProblems(fx), postRecordingProblems(sim, fx, params, rec)];
    expect(all.flat()).toEqual([]);
  });

  it('respawn box: empty cells only (no tile, no exit)', () => {
    expect(respawnBoxProblems(level([POST], withCell(5, 22, '#')), cfg)).toEqual([
      'w0-96: post 0 respawn box cell (22, 5) is safe; it must be empty',
    ]);
    expect(respawnBoxProblems(level([POST], withCell(5, 22, 'E')), cfg)).toEqual([
      'w0-96: post 0 respawn box cell (22, 5) is exit; it must be empty',
    ]);
  });

  it('respawn box: clear of slab paths, shot lanes and hints', () => {
    expect(respawnBoxProblems(level([POST, 'mover: 20 4 3x1 safe speed=2 path=w30,d1,w30,u1']), cfg)).toEqual([
      'w0-96: post 0 respawn box overlaps mover 0 swept area',
    ]);
    expect(respawnBoxProblems(level([POST, 'emitter: 30 5 dir=l range=10 speed=4 period=90']), cfg)).toEqual([
      'w0-96: post 0 respawn box overlaps emitter 0 lane',
    ]);
    expect(respawnBoxProblems(level([POST, 'hint: move 23 6']), cfg)).toEqual(['w0-96: post 0 respawn box overlaps hint move at (23, 6)']);
  });

  it('respawn box: never under the HUD at any camera position', () => {
    // 20 rows (taller than the view, so the camera can sit at the top). Post at (22, 2): box rows 1-2 are
    // screen y 16-48 at the top-left camera, under the HUD (y < 40). A shorter level is centred, so no top row is.
    const rows = withCell(3, 22, '#', [...Array.from({ length: 11 }, () => '.'.repeat(W)), ...ROWS]);
    expect(respawnBoxProblems(level(['checkpoint: 22 2'], rows), cfg)).toEqual([
      'w0-96: post 0 respawn box can pass under the HUD area at some camera position',
    ]);
  });

  it('recovery: 4 safe floor columns from the post', () => {
    expect(recoveryProblems(level([POST], withCell(7, 25, 'B')))).toEqual([
      'w0-96: post 0 floor cell (25, 7) is colored; 4 safe floor columns from the post',
    ]);
    expect(recoveryProblems(level([POST], withCell(7, 26, 'B')))).toEqual([]);
  });

  it(`size: width <= ${MAX_LEVEL_WIDTH}, rows <= ${MAX_POST_LEVEL_ROWS} with posts`, () => {
    const wide = (w: number): string[] => ['.'.repeat(w), '.@' + '.'.repeat(w - 3) + 'E', '#'.repeat(w)];
    expect(sizeProblems(level([], wide(MAX_LEVEL_WIDTH)))).toEqual([]);
    expect(sizeProblems(level([], wide(MAX_LEVEL_WIDTH + 1)))).toEqual(['w0-96: 481 columns; at most 480']);
    const tall = [...Array.from({ length: 7 }, () => '.'.repeat(W)), ...ROWS];
    expect(sizeProblems(level([], tall))).toEqual([]);
    expect(sizeProblems(level(['checkpoint: 22 13'], tall))).toEqual(['w0-96: 16 rows in a level with posts; at most 15']);
  });

  it('recording: deathless after a post, although a post respawn still wins with wonAtStep === steps', () => {
    const fx = level([POST]);
    let letGo = -1;
    const rec = record(fx, (k, x) => {
      if (letGo < 0 && x > 31) letGo = k;
      return letGo >= 0 && k < letGo + 40 ? idle : right;
    });
    const problems = postRecordingProblems(sim, fx, params, rec);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^w0-96: recording dies at step \d+; a level with posts ships a deathless recording$/);
  });

  it('recording: no restart, so wonAtStep === steps', () => {
    const fx = level([POST]);
    const press: InputFrame = { ...right, restart: true };
    const rec = record(fx, (k) => (k === 10 ? press : right));
    const problems = postRecordingProblems(sim, fx, params, rec);
    expect(problems[0]).toBe('w0-96: recording restarts at step 11');
    expect(problems[1]).toMatch(/^w0-96: wonAtStep \d+ !== steps \d+$/);
    expect(problems).toHaveLength(2);
  });

  it('recording: lights every post in order', () => {
    const fx = level([POST, 'checkpoint: 62 6']);
    expect(postRecordingProblems(sim, fx, params, record(fx, () => right))).toEqual([
      'w0-96: recording lights posts [0]; it must light [0, 1] in order',
    ]);
  });

  it('levels without posts are not checked', () => {
    const fx = level([]);
    const press: InputFrame = { ...right, restart: true };
    expect(postRecordingProblems(sim, fx, params, record(fx, (k) => (k === 10 ? press : right)))).toEqual([]);
  });
});
