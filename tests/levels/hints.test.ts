/**
 * Hint headers in the shipped levels (docs/design/features/onboarding-hints.md
 * acceptance 5 and the placement half of 6). The parser checks ids, anchors
 * and the count; this file checks what it leaves to level review:
 * - the glyph's 3 x 2 box covers only empty cells, and the anchor is at least
 *   3 rows above the floor under it (`hintPlacement.ts`);
 * - hints are render-only: a level replays to the same `wonAtStep` with its
 *   `hint:` lines removed.
 * Self-checks prove each rule fails on a planted bad hint. Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import { MAX_LEVEL_HINTS, expandRuns, parseLevel, parseSolution, runInputLog, type Level } from '../../src/core';
import tuningJson from '../../src/data/tuning.json';
import { cameraFocus, cameraScroll, snapFeet } from '../../src/entities/camera';
import { hintHudReachProblems, hintPlacementProblems } from './hintPlacement';
import { HUD_AREA, VIEW, hintBoxPx, hudAreaProblems, type HintBoxPx, type RuleConfig } from './levelRules';
import { LEVEL_FILES, TXT_SUFFIX, byStem, levels, params, sim, solutions } from './shipped';

const HINT_LINE = /^hint:.*(\r?\n|$)/gm;
const levelTexts = byStem(LEVEL_FILES, TXT_SUFFIX);
const hinted = levels.filter((level) => (level.meta.hints?.length ?? 0) > 0);

function parsed(text: string, stem: string): Level {
  const result = parseLevel(text, stem);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.value;
}

/** `wonAtStep` of the level's recording replayed on `level`; null without a recording or a win. */
function wonAtStep(level: Level): number | null {
  const text = solutions.get(level.meta.id);
  const solution = text === undefined ? null : parseSolution(text, `${level.meta.id}.solution`);
  if (solution === null || !solution.ok) return null;
  return runInputLog(sim, level, params, expandRuns(solution.value.runs)).final.wonAtStep;
}

describe('hint placement (shipped levels)', () => {
  it('finds hinted levels (an empty list would pass every case below vacuously)', () => {
    expect(hinted.length).toBeGreaterThan(0);
  });

  it.each(hinted.map((level) => [level.meta.id, level] as const))('%s: boxes empty, 3 rows above the floor', (_id, level) => {
    expect(hintPlacementProblems(level)).toEqual([]);
  });

  it.each(hinted.map((level) => [level.meta.id, level] as const))('%s: same wonAtStep without its hint lines', (id, level) => {
    const text = levelTexts.get(id) ?? '';
    const bare = parsed(text.replace(HINT_LINE, ''), id);
    expect(bare.meta.hints).toBeUndefined();
    const won = wonAtStep(level);
    expect(won, `${id} has no winning recording`).not.toBeNull();
    expect(wonAtStep(bare)).toBe(won);
  });
});

describe('hint placement self-check (planted bad hints)', () => {
  const grid = ['.......', '.@.....', '.......', '.......', '####.##', '......E'];
  const level = (hint: string, rows: readonly string[] = grid): Level =>
    parsed(['id: w0-99', 'title: t', 'world: 0', 'teaches: t', 'version: 1', hint, '---', ...rows].join('\n'), 'w0-99');
  const box = 'its 3 x 2 box must cover only empty cells';

  it('passes a hint with an empty box 3 rows above the floor (the @ cell counts as empty)', () => {
    expect(hintPlacementProblems(level('hint: move 2 1'))).toEqual([]);
  });

  it('passes a hint over a pit (no floor below any column of its box)', () => {
    const widePit = ['.......', '.@.....', '.......', '.......', '#.....#', '......E'];
    expect(hintPlacementProblems(level('hint: jump 3 2', widePit))).toEqual([]);
  });

  it('fails a hint over a pit whose box overhangs a higher floor in a neighbouring column', () => {
    expect(hintPlacementProblems(level('hint: jump 4 2'))).toEqual([
      'w0-99: hint jump at col 4, row 2: anchor is 2 row(s) above the floor (row 4); needs at least 3',
    ]);
  });

  it('fails a hint 2 rows above the floor', () => {
    expect(hintPlacementProblems(level('hint: jump 2 2'))).toEqual([
      'w0-99: hint jump at col 2, row 2: anchor is 2 row(s) above the floor (row 4); needs at least 3',
    ]);
  });

  it('fails a box that leaves the grid', () => {
    expect(hintPlacementProblems(level('hint: move 0 1'))).toEqual([
      `w0-99: hint move at col 0, row 1: ${box}; cell (-1, 0) is outside the grid`,
      `w0-99: hint move at col 0, row 1: ${box}; cell (-1, 1) is outside the grid`,
    ]);
  });

  it('fails two hints whose boxes overlap', () => {
    const twoHints = ['hint: move 2 1', 'hint: jump 4 0'].join('\n');
    expect(hintPlacementProblems(level(twoHints))).toContainEqual('w0-99: hints move (2, 1) and jump (4, 0) overlap');
  });

  it('fails a box that covers a tile or the exit', () => {
    const problems = hintPlacementProblems(level('hint: shiftUp 5 5'));
    expect(problems).toContainEqual(`w0-99: hint shiftUp at col 5, row 5: ${box}; cell (5, 4) is safe`);
    expect(problems).toContainEqual(`w0-99: hint shiftUp at col 5, row 5: ${box}; cell (6, 5) is exit`);
  });
});

/**
 * B8-06 (requests 2026-11-04 / 2026-11-20, M2-03): `onboarding-hints.md`
 * checks 10, 13 and 14 as far as a test can read them from the parsed levels
 * and the recordings. The box, floor, count, id and anchor rules are above and
 * in the parser; this pins the placements design asked for and the HUD rule at
 * every camera position.
 */
const tuningCfg: RuleConfig = {
  tileSize: tuningJson.tileSize,
  playerHeightTiles: tuningJson.playerHeightTiles,
  cameraMaxApartTiles: tuningJson.cameraMaxApartTiles,
};

/** Check 10 (2026-11-19) and check 13 (2026-11-20): the exact headers, in file order, and `version` 1. */
const PLACEMENTS: Readonly<Record<string, readonly string[]>> = {
  'w1-03': ['shiftUp 2 6'],
  'w2-04': ['shiftUp 8 4', 'jump 8 6'],
  'w3-03': ['shiftUp 2 3', 'jump 12 3'],
  'w3-04': ['shiftUp 2 3', 'jump 12 3'],
  'w3-05': ['jump 12 3', 'shiftUp 36 3', 'jump 41 3'],
};
const PLACED_VERSION = 1;

const headers = (level: Level): readonly string[] => (level.meta.hints ?? []).map((h) => `${h.glyph} ${h.anchor.col} ${h.anchor.row}`);

describe('design placements (onboarding-hints.md checks 10 and 13)', () => {
  it.each(Object.entries(PLACEMENTS))('%s has exactly its placed hints and version 1', (id, expected) => {
    const level = levels.find((l) => l.meta.id === id);
    expect(level, `${id} is not shipped`).toBeDefined();
    expect(headers(level as Level)).toEqual(expected);
    expect(level?.meta.version).toBe(PLACED_VERSION);
  });

  it('no shipped level has more than MAX_LEVEL_HINTS hints', () => {
    expect(levels.filter((l) => (l.meta.hints?.length ?? 0) > MAX_LEVEL_HINTS).map((l) => l.meta.id)).toEqual([]);
  });
});

describe('hint boxes never pass under the HUD (checks 11 and 14, any camera position)', () => {
  it.each(hinted.map((level) => [level.meta.id, level] as const))('%s: no hint box under the HUD at any scroll', (_id, level) => {
    expect(hintHudReachProblems(level, tuningCfg)).toEqual([]);
  });

  it('self-check: fails a hint that is clear at the start but passes under the HUD once the camera scrolls', () => {
    // 60 x 20 tiles: scroll x 0..480, y 0..50. A hint at col 30, row 2 (box x 464-512) is right of the HUD at the
    // start (scroll x 0) and under it from scroll x 345.
    const rows = Array.from({ length: 20 }, (_, r) => (r === 1 ? '.@' + '.'.repeat(57) + 'E' : r === 19 ? '#'.repeat(60) : '.'.repeat(60)));
    const text = ['id: w0-97', 'title: t', 'world: 0', 'teaches: t', 'version: 1', 'hint: jump 30 2', '---', ...rows].join('\n');
    const level = parsed(text, 'w0-97');
    expect(hudAreaProblems(level, tuningCfg)).toEqual([]);
    expect(hintHudReachProblems(level, tuningCfg)).toEqual(['w0-97: hint jump at (30, 2) can pass under the HUD area at some camera position']);
  });

  it('self-check: passes the same hint low enough that no vertical scroll brings it under the HUD', () => {
    const rows = Array.from({ length: 20 }, (_, r) => (r === 1 ? '.@' + '.'.repeat(57) + 'E' : r === 19 ? '#'.repeat(60) : '.'.repeat(60)));
    const text = ['id: w0-97', 'title: t', 'world: 0', 'teaches: t', 'version: 1', 'hint: jump 30 7', '---', ...rows].join('\n');
    expect(hintHudReachProblems(parsed(text, 'w0-97'), tuningCfg)).toEqual([]);
  });
});

/** Check 14, the sim half: w3-05's recording at the step both bodies are held at the kerbs. */
const W3_05_KERB_STEP = 725;
/** The kerb face in the runner lane, world px (onboarding-hints.md check 14). */
const W3_05_KERB_PX = 720;

describe('w3-05 kerb hints (onboarding-hints.md check 14, from the recording)', () => {
  const level = levels.find((l) => l.meta.id === 'w3-05') as Level;
  const text = solutions.get('w3-05') ?? '';
  const solution = parseSolution(text, 'w3-05.solution');
  const states = solution.ok ? runInputLog(sim, level, params, expandRuns(solution.value.runs)).states : [];
  const state = states.find((s) => s.step === W3_05_KERB_STEP);
  const ts = tuningCfg.tileSize;
  const box = (glyph: string): HintBoxPx => {
    const hint = (level.meta.hints ?? []).find((h) => h.glyph === glyph && h.anchor.col > 30);
    if (hint === undefined) throw new Error(`w3-05 has no ${glyph} hint past col 30`);
    return hintBoxPx(hint, ts);
  };

  it('replays to the kerb step with both bodies still playing', () => {
    expect(state?.status).toBe('playing');
    expect(state?.player.home).toBe(false);
    expect(state?.twin?.home).toBe(false);
  });

  it('both kerb boxes are on screen, the shiftUp box is left of both bodies, the jump box left of the kerb', () => {
    if (state === undefined || state.twin === null) throw new Error('no kerb state');
    const bodies = [state.player, state.twin].map((p) => ({ ...snapFeet(p.x, p.y, ts), home: p.home }));
    const height = Math.round(tuningCfg.playerHeightTiles * ts);
    const focus = cameraFocus(bodies, height, tuningCfg.cameraMaxApartTiles * ts) ?? { x: 0, y: 0 };
    const s = cameraScroll(focus.x, focus.y, VIEW.width, VIEW.height, level.width * ts, level.height * ts);
    const halfWidth = (tuningJson.playerWidthTiles * ts) / 2;
    for (const b of [box('shiftUp'), box('jump')]) {
      expect(b.left - s.x).toBeGreaterThanOrEqual(0);
      expect(b.right - s.x).toBeLessThanOrEqual(VIEW.width);
      expect(b.top - s.y).toBeGreaterThanOrEqual(HUD_AREA.bottom);
      expect(b.bottom - s.y).toBeLessThanOrEqual(VIEW.height);
    }
    for (const body of bodies) expect(box('shiftUp').right).toBeLessThan(body.px - halfWidth);
    expect(box('jump').right).toBeLessThan(W3_05_KERB_PX);
  });
});
