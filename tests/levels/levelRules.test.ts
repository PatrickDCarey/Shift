/**
 * Shipped levels against the review-only level rules in `levelRules.ts`:
 * Tandem fits 15 rows (G4), Tandem lane colouring and the HUD area
 * (`decisions.md` 2026-11-16). Levels come from the same glob as the game,
 * so new files are picked up without a code change. Owner: tech-lead.
 *
 * A shipped level that breaks a rule is never fixed by weakening the rule: it
 * goes in `KNOWN_FAILURES` with the request line that asks for the level fix,
 * and its case asserts the breach is still there, so the entry must be removed
 * the day the level is fixed.
 */
import { describe, expect, it } from 'vitest';
import { parseLevel, type Level } from '../../src/core';
import tuningJson from '../../src/data/tuning.json';
import { hudAreaProblems, startScroll, tandemHeightProblems, tandemLaneProblems, type RuleConfig } from './levelRules';
import { levels } from './shipped';

type Rule = 'tandemHeight' | 'tandemLanes' | 'hudArea';

/** `<rule>:<level id>` -> the requests.md line that asks for the fix. */
const KNOWN_FAILURES: Readonly<Record<string, string>> = {};

const cfg: RuleConfig = {
  tileSize: tuningJson.tileSize,
  playerHeightTiles: tuningJson.playerHeightTiles,
  cameraMaxApartTiles: tuningJson.cameraMaxApartTiles,
};

const CHECKS: Readonly<Record<Rule, (level: Level) => readonly string[]>> = {
  tandemHeight: (level) => tandemHeightProblems(level, cfg.playerHeightTiles),
  tandemLanes: tandemLaneProblems,
  hudArea: (level) => hudAreaProblems(level, cfg),
};

const tandem = levels.filter((level) => level.twinStart !== null);

function expectRule(rule: Rule, level: Level): void {
  const problems = CHECKS[rule](level);
  const known = KNOWN_FAILURES[`${rule}:${level.meta.id}`];
  if (known === undefined) expect(problems).toEqual([]);
  else expect(problems, `known failure (${known}) is fixed: remove it from KNOWN_FAILURES`).not.toEqual([]);
}

describe('level rules (shipped levels)', () => {
  it('finds levels and at least one Tandem level (an empty list would pass vacuously)', () => {
    expect(levels.length).toBeGreaterThan(0);
    expect(tandem.length).toBeGreaterThan(0);
  });

  it.each(tandem.map((l) => [l.meta.id, l] as const))('%s: both bodies fit in 15 rows (G4)', (_id, level) => {
    expectRule('tandemHeight', level);
  });

  it.each(tandem.map((l) => [l.meta.id, l] as const))('%s: spawns 3+ rows apart, colored tiles nearer their own lane', (_id, level) => {
    expectRule('tandemLanes', level);
  });

  it.each(levels.map((l) => [l.meta.id, l] as const))('%s: no colored tile, exit or hint under the HUD at the start', (_id, level) => {
    expectRule('hudArea', level);
  });

  it('every KNOWN_FAILURES entry names a shipped level', () => {
    const ids = new Set(levels.map((l) => l.meta.id));
    expect(Object.keys(KNOWN_FAILURES).filter((key) => !ids.has(key.split(':')[1] ?? ''))).toEqual([]);
  });
});

describe('level rules self-check (planted levels)', () => {
  const level = (rows: readonly string[], hints: readonly string[] = []): Level => {
    const text = ['id: w0-98', 'title: t', 'world: 0', 'teaches: t', 'version: 1', ...hints, '---', ...rows].join('\n');
    const result = parseLevel(text, 'w0-98');
    if (!result.ok) throw new Error(result.errors.join('\n'));
    return result.value;
  };
  const sky = '..............................';
  const floor = '##############################';
  /** Runner on row 1 (floor row 2), twin on row `twinRow`, rows of sky between, `extra` sky rows at the bottom. */
  const stacked = (twinRow: number, divider = floor, twinFloor = floor): string[] => {
    const rows = [sky, '.@...........................E', divider];
    while (rows.length < twinRow) rows.push(sky);
    rows.push('.&...........................E', twinFloor);
    return rows;
  };

  it('passes w3-01-shaped stacked lanes and a level without a twin', () => {
    const lanes = level(stacked(8, '###BBBB#######################', '###GGGG#######################'));
    expect(tandemHeightProblems(lanes, 1.5)).toEqual([]);
    expect(tandemLaneProblems(lanes)).toEqual([]);
    expect(tandemLaneProblems(level([sky, '.@...........................E', floor]))).toEqual([]);
  });

  it('fails bodies more than 15 rows apart (13.5 + 1.5 = 15 passes, 14 + 1.5 fails)', () => {
    expect(tandemHeightProblems(level(stacked(14)), 1.5)).toEqual([]);
    expect(tandemHeightProblems(level(stacked(15)), 1.5)).toEqual([
      'w0-98: the bodies span 15.5 rows at spawn (start rows 1 and 15 plus 1.5); at most 15',
    ]);
  });

  it('fails spawn rows fewer than 3 apart', () => {
    const shared = level([sky, '.@...........................E', '.&...........................E', floor]);
    expect(tandemLaneProblems(shared)).toEqual(['w0-98: spawn rows 1 and 2 are 1 apart; at least 3']);
  });

  it('fails a colored tile in the top rows of the lower lane (nearer the other start row)', () => {
    const rows = stacked(9);
    rows[3] = '.....YY.......................';
    expect(tandemLaneProblems(level(rows))).toEqual([
      'w0-98: colored tile (5, 3) is in the lane of start row 9 but not strictly nearer it than start row 1',
      'w0-98: colored tile (6, 3) is in the lane of start row 9 but not strictly nearer it than start row 1',
    ]);
    rows[3] = '.....##.......................';
    rows[7] = '.....YY.......................';
    expect(tandemLaneProblems(level(rows))).toEqual([]);
  });

  it('frames the start like the scene: clamped to the level, centred when smaller than the view', () => {
    // 20 x 3 tiles = 320 x 48 px in a 480 x 270 view: centred on both axes.
    expect(startScroll(level(['....................', '.@.................E', '####################']), cfg)).toEqual({ x: -80, y: -111 });
    // 60 tiles wide, spawn at col 1: clamped to the left edge.
    expect(startScroll(level(['.'.repeat(60), '.@' + '.'.repeat(57) + 'E', '#'.repeat(60)]), cfg).x).toBe(0);
  });

  it('fails a colored tile, an exit or a hint under the HUD area and passes safe tiles there', () => {
    const wide = '#'.repeat(60);
    // 60 x 16 tiles (960 x 256 px): scroll (0, -7), so row 0 is at screen y 7-23, under the HUD.
    const rows = ['Y' + '.'.repeat(59), '.'.repeat(59) + 'E', ...Array.from({ length: 12 }, () => '.'.repeat(60)), '.@' + '.'.repeat(58), wide];
    expect(hudAreaProblems(level(rows), cfg)).toEqual(['w0-98: colored tile (0, 0) is under the HUD area at the starting camera']);
    rows[0] = '#' + '.'.repeat(59);
    expect(hudAreaProblems(level(rows), cfg)).toEqual([]);
    expect(hudAreaProblems(level(rows, ['hint: move 4 1']), cfg)).toEqual([
      'w0-98: hint move at (4, 1) is under the HUD area at the starting camera',
    ]);
    expect(hudAreaProblems(level(rows, ['hint: move 9 1']), cfg)).toEqual([]);
  });
});
