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
import { expandRuns, parseLevel, parseSolution, runInputLog, type Level } from '../../src/core';
import { hintPlacementProblems } from './hintPlacement';
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
  it.each(hinted.map((level) => [level.meta.id, level] as const))('%s: boxes empty, 3 rows above the floor', (_id, level) => {
    expect(hintPlacementProblems(level)).toEqual([]);
  });

  it.each(hinted.map((level) => [level.meta.id, level] as const))('%s: same wonAtStep without its hint lines', (id, level) => {
    const text = levelTexts.get(id) ?? '';
    const bare = parsed(text.replace(HINT_LINE, ''), id);
    expect(bare.meta.hints).toBeUndefined();
    expect(wonAtStep(bare)).toBe(wonAtStep(level));
  });
});

describe('hint placement self-check (planted bad hints)', () => {
  const grid = ['.......', '.@.....', '.......', '.......', '####.##', '......E'];
  const level = (hint: string): Level =>
    parsed(['id: w0-99', 'title: t', 'world: 0', 'teaches: t', 'version: 1', hint, '---', ...grid].join('\n'), 'w0-99');
  const box = 'its 3 x 2 box must cover only empty cells';

  it('passes a hint with an empty box 3 rows above the floor (the @ cell counts as empty)', () => {
    expect(hintPlacementProblems(level('hint: move 2 1'))).toEqual([]);
  });

  it('passes a hint over a pit (no floor below)', () => {
    expect(hintPlacementProblems(level('hint: jump 4 2'))).toEqual([]);
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
