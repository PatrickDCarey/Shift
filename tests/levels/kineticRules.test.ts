/**
 * Shipped levels against the kinetic and long-level rules in `kineticRules.ts`
 * (B11-15), plus a planted fixture per rule that must fail. Levels come from
 * the game's own glob, so w4/w5 files are checked the day they land.
 * A shipped level that breaks a rule is never fixed by weakening the rule:
 * it goes in `KNOWN_FAILURES` with its request line. Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import { parseLevel, parseSolution, type Level } from '../../src/core';
import tuningJson from '../../src/data/tuning.json';
import {
  MAX_RECORDING_STEPS,
  keepOutProblems,
  kineticValueProblems,
  laneProblems,
  recordingLengthProblems,
  slabRestProblems,
  slabRoomProblems,
} from './kineticRules';
import type { RuleConfig } from './levelRules';
import { levels, solutions } from './shipped';

type Rule = 'values' | 'slabRoom' | 'slabRest' | 'lanes' | 'keepOut' | 'recording';

/** `<rule>:<level id>` -> the requests.md line that asks for the fix. */
const KNOWN_FAILURES: Readonly<Record<string, string>> = {};
/** Slab ends no fair line uses: `<id>:mover<i>:<token>` -> its `levels/README.md` line. */
const REST_EXEMPT: Readonly<Record<string, string>> = {};

const cfg: RuleConfig = {
  tileSize: tuningJson.tileSize,
  playerHeightTiles: tuningJson.playerHeightTiles,
  cameraMaxApartTiles: tuningJson.cameraMaxApartTiles,
};

function recordingSteps(level: Level): number {
  const text = solutions.get(level.meta.id);
  const parsed = text === undefined ? null : parseSolution(text, `${level.meta.id}.solution`);
  return parsed?.ok ? parsed.value.steps : 0; // a missing or bad recording fails solvability.test.ts
}

const CHECKS: Readonly<Record<Rule, (level: Level) => readonly string[]>> = {
  values: kineticValueProblems,
  slabRoom: slabRoomProblems,
  slabRest: (level) => slabRestProblems(level, new Set(Object.keys(REST_EXEMPT))),
  lanes: laneProblems,
  keepOut: (level) => keepOutProblems(level, cfg),
  recording: (level) => recordingLengthProblems(level.meta.id, recordingSteps(level)),
};

describe('kinetic and long-level rules (shipped levels)', () => {
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

  it('every KNOWN_FAILURES and REST_EXEMPT entry names a shipped level', () => {
    const ids = new Set(levels.map((l) => l.meta.id));
    const keys = [...Object.keys(KNOWN_FAILURES).map((k) => k.split(':')[1]), ...Object.keys(REST_EXEMPT).map((k) => k.split(':')[0])];
    expect(keys.filter((id) => !ids.has(id ?? ''))).toEqual([]);
  });
});

describe('kinetic rules self-check (planted levels)', () => {
  const SLAB = 'mover: 6 7 3x1 safe speed=2 path=w30,r14,w30,l14';
  const SHOT = 'emitter: 29 4 dir=l range=10 speed=4 period=90';
  // 30 x 9: a pit at cols 5-22 on row 7 for the slab, a wall at (19, 4) for the lane to sink into.
  const ROWS = [
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '...................#..........',
    '..............................',
    '.@.........................E..',
    '#####..................#######',
    '##############################',
  ];
  const level = (headers: readonly string[], rows: readonly string[] = ROWS): Level => {
    const text = ['id: w0-97', 'title: t', 'world: 0', 'teaches: t', 'version: 1', ...headers, '---', ...rows].join('\n');
    const result = parseLevel(text, 'w0-97');
    if (!result.ok) throw new Error(result.errors.join('\n'));
    return result.value;
  };
  const withCell = (row: number, col: number, c: string): string[] =>
    ROWS.map((r, i) => (i === row ? r.slice(0, col) + c + r.slice(col + 1) : r));

  it('passes the fixture on every rule', () => {
    const fx = level([SLAB, SHOT]);
    expect([kineticValueProblems(fx), slabRoomProblems(fx), slabRestProblems(fx), laneProblems(fx), keepOutProblems(fx, cfg)].flat()).toEqual([]);
  });

  it('values: slab speed 1 or 2 and width 2-8, shot speed 2 or 4 and period >= 12', () => {
    const fx = level(['mover: 6 7 1x1 safe speed=4 path=w30,r14,w30,l14', 'emitter: 29 4 dir=l range=10 speed=8 period=11']);
    expect(kineticValueProblems(fx)).toEqual([
      'w0-97: mover 0 speed 4; levels use 1 or 2',
      'w0-97: mover 0 width 1; levels use 2-8',
      'w0-97: emitter 0 speed 8; levels use 2 or 4',
      'w0-97: emitter 0 period 11; at least 12',
    ]);
  });

  it('slab room: 2 empty rows over the swept area, nothing solid inside it', () => {
    expect(slabRoomProblems(level([SLAB], withCell(5, 12, '#')))).toEqual([
      'w0-97: mover 0 headroom cell (12, 5) is safe; 2 empty rows above the swept area',
    ]);
    expect(slabRoomProblems(level(['mover: 6 7 3x1 safe speed=2 path=w30,r17,w30,l17']))).toEqual([
      'w0-97: mover 0 sweeps over safe tile (23, 7)',
      'w0-97: mover 0 sweeps over safe tile (24, 7)',
      'w0-97: mover 0 sweeps over safe tile (25, 7)',
    ]);
  });

  it('slab rest: at least 30 steps where a horizontal leg ends, unless exempted', () => {
    const fx = level(['mover: 6 7 3x1 safe speed=2 path=w29,r14,w30,l14']);
    expect(slabRestProblems(fx)).toEqual(['w0-97: mover 0 rests 29 steps after path token 3 (l14); at least 30 where a horizontal leg ends']);
    expect(slabRestProblems(fx, new Set(['w0-97:mover0:3']))).toEqual([]);
    // A lift (vertical only) needs no rest; one leg split in two tokens rests only at its ends.
    expect(slabRestProblems(level(['mover: 6 6 3x1 safe speed=2 path=u2,d2']))).toEqual([]);
    expect(slabRestProblems(level(['mover: 6 7 3x1 safe speed=2 path=w30,r7,r7,w30,l14']))).toEqual([]);
  });

  it('lanes: clear of tiles and ending at a wall', () => {
    expect(laneProblems(level([SHOT], withCell(4, 24, 'B')))).toEqual(['w0-97: emitter 0 lane crosses colored tile (24, 4)']);
    expect(laneProblems(level([SHOT], withCell(4, 19, '.')))).toEqual([
      'w0-97: emitter 0 lane ends in empty cell (19, 4); it must end at a wall',
    ]);
  });

  it('keep-out: swept areas and lanes clear of spawn, exit and hints', () => {
    expect(keepOutProblems(level(['emitter: 10 6 dir=l range=10 speed=4 period=90']), cfg)).toEqual([
      'w0-97: emitter 0 lane overlaps the spawn box at (1, 6)',
    ]);
    expect(keepOutProblems(level(['emitter: 20 6 dir=r range=9 speed=4 period=90']), cfg)).toEqual([
      'w0-97: emitter 0 lane overlaps the exit at (27, 6)',
    ]);
    expect(keepOutProblems(level([SLAB, 'hint: move 10 7']), cfg)).toEqual(['w0-97: mover 0 swept area overlaps hint move at (10, 7)']);
  });

  it('keep-out: nothing kinetic where the HUD can cover it at some camera position', () => {
    // 60 x 16 tiles: row 1 is under the HUD (screen y < 40) whenever the camera is at the left edge.
    const rows = ['.'.repeat(60), '.'.repeat(59) + 'E', ...Array.from({ length: 12 }, () => '.'.repeat(60)), '.@' + '.'.repeat(58), '#'.repeat(60)];
    rows[1] = '.'.repeat(12) + '#' + '.'.repeat(46) + 'E';
    expect(keepOutProblems(level(['emitter: 2 1 dir=r range=10 speed=4 period=90'], rows), cfg)).toEqual([
      'w0-97: emitter 0 lane can pass under the HUD area at some camera position',
    ]);
  });

  it(`recording: at most ${MAX_RECORDING_STEPS} steps`, () => {
    expect(recordingLengthProblems('w0-97', MAX_RECORDING_STEPS)).toEqual([]);
    expect(recordingLengthProblems('w0-97', MAX_RECORDING_STEPS + 1)).toEqual(['w0-97: recording is 5401 steps; at most 5400']);
  });
});
