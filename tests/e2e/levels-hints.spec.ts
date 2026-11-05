/**
 * Node-side level review (no browser): onboarding-hints.md checks 5 and 6 on the shipped files.
 * The hook does not expose hints, so the checks read the parsed levels through the public `src/core` barrel,
 * exactly as `tests/levels` does. Check 5 strips every `hint:` header line and replays the recording with the
 * real sim: the hints are render-only, so `wonAtStep` must be identical.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deriveParams, createSim, isTuning, parseLevel, parseSolution, runInputLog, expandRuns, step, type Level, type SimParams } from '../../src/core';
import { expect, test } from '@playwright/test';

const LEVELS_DIR = fileURLToPath(new URL('../../levels/', import.meta.url));
const tuning: unknown = JSON.parse(readFileSync(fileURLToPath(new URL('../../src/data/tuning.json', import.meta.url)), 'utf8'));
if (!isTuning(tuning)) throw new Error('src/data/tuning.json is not a valid Tuning');
const params: SimParams = deriveParams(tuning);

const levelIds = readdirSync(LEVELS_DIR)
  .filter((f) => /^w\d-\d\d\.txt$/.test(f))
  .map((f) => f.slice(0, -4))
  .sort();

function read(name: string): string {
  return readFileSync(`${LEVELS_DIR}${name}`, 'utf8');
}

function load(text: string, id: string): Level {
  const parsed = parseLevel(text, id);
  if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
  return parsed.value;
}

/** wonAtStep of the shipped recording replayed on `level`, or null if it did not win. */
function replayWin(level: Level, id: string): number | null {
  const sol = parseSolution(read(`${id}.solution.txt`), `${id}.solution`);
  if (!sol.ok) throw new Error(sol.errors.join('\n'));
  const run = runInputLog({ createSim, step }, level, params, expandRuns(sol.value.runs));
  return run.final.status === 'won' ? run.final.wonAtStep : null;
}

const withoutHints = (text: string): string => text.replace(/^hint:.*\r?\n/gm, '');

test('the shipped levels include w1-03, w1-04 and w1-05 (board M2-04)', () => {
  expect(levelIds).toEqual(expect.arrayContaining(['w1-01', 'w1-02', 'w1-03', 'w1-04', 'w1-05']));
});

for (const [id, steps] of [['w1-01', 414], ['w1-02', 311]] as const) {
  test(`hint check 5: ${id} wins on step ${steps} with and without its hint headers`, () => {
    const text = read(`${id}.txt`);
    expect(text, 'the file has hint headers').toMatch(/^hint:/m);
    expect(replayWin(load(text, id), id), 'with hints').toBe(steps);
    const bare = withoutHints(text);
    expect(bare).not.toMatch(/^hint:/m);
    const level = load(bare, id);
    expect(level.meta.hints, 'no hints after stripping').toBeUndefined();
    expect(replayWin(level, id), 'without hints').toBe(steps);
  });
}

const EXPECTED: Record<string, readonly string[]> = {
  'w1-01': ['move'],
  'w1-02': ['shiftUp', 'shiftDown'],
};

for (const id of levelIds) {
  test(`hint check 6: ${id} hints are empty cells at least 3 rows above the floor, at most 3 per level`, () => {
    const level = load(read(`${id}.txt`), id);
    const hints = level.meta.hints ?? [];
    expect(hints.length).toBeLessThanOrEqual(3);
    for (const h of hints) {
      const { col, row } = h.anchor;
      const at = (r: number): string => level.tiles[r * level.width + col]?.kind ?? 'outside';
      expect(at(row), `${id} hint ${h.glyph} anchor (${col},${row}) is an empty cell`).toBe('empty');
      let floor = row + 1;
      while (floor < level.height && at(floor) === 'empty') floor += 1;
      expect(floor, `${id} hint ${h.glyph}: there is a floor under the anchor`).toBeLessThan(level.height);
      expect(floor - row, `${id} hint ${h.glyph}: rows above the floor`).toBeGreaterThanOrEqual(3);
    }
    const want = EXPECTED[id];
    if (want) expect(hints.map((h) => h.glyph), `${id} hint glyphs in order`).toEqual(want);
  });
}

test('hint check 6: w1-02 shiftUp is over the first pad and shiftDown over the second', () => {
  const level = load(read('w1-02.txt'), 'w1-02');
  const [up, down] = level.meta.hints ?? [];
  // Pad 1 is columns 0-2, pad 2 is columns 8-10 (the file's header comment and grid).
  expect(up?.glyph).toBe('shiftUp');
  expect(up?.anchor.col).toBeGreaterThanOrEqual(0);
  expect(up?.anchor.col).toBeLessThanOrEqual(2);
  expect(down?.glyph).toBe('shiftDown');
  expect(down?.anchor.col).toBeGreaterThanOrEqual(8);
  expect(down?.anchor.col).toBeLessThanOrEqual(10);
});
