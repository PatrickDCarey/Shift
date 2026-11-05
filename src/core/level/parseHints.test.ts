import { describe, expect, it } from 'vitest';
import { HINT_GLYPHS, MAX_LEVEL_HINTS, type Level, type ParseResult } from '../types';
import { parseLevel } from './index';

const BASE = ['id: w1-01', 'title: Test', 'world: 1', 'teaches: nothing', 'version: 1'];
/** Hint anchors below are on row 0 (all `.`) of this 12-wide, 3-row grid; row 1 holds the start and the exit. */
const GRID = ['............', '.@........E.', '############'];
const BOM = '﻿';

function levelText(hints: readonly string[], grid: readonly string[] = GRID): string {
  return [...BASE, ...hints, '---', ...grid, ''].join('\n');
}

function ok(result: ParseResult<Level>): Level {
  if (!result.ok) throw new Error(`expected ok, got errors:\n${result.errors.join('\n')}`);
  return result.value;
}

function errors(result: ParseResult<Level>): readonly string[] {
  if (result.ok) throw new Error('expected errors, got a level');
  return result.errors;
}

describe('parseLevel: hint headers', () => {
  it('leaves hints absent, not empty, when the file has none', () => {
    const level = ok(parseLevel(levelText([]), 'w1-01'));
    expect('hints' in level.meta).toBe(false);
    expect(level.meta.hints).toBeUndefined();
  });

  it('parses a hint into { glyph, anchor: { col, row } }', () => {
    const level = ok(parseLevel(levelText(['hint: move 1 0']), 'w1-01'));
    expect(level.meta.hints).toEqual([{ glyph: 'move', anchor: { col: 1, row: 0 } }]);
  });

  it('keeps file order and accepts all four glyph ids', () => {
    const hints = ['hint: jump 9 0', 'hint: shiftDown 6 0', 'hint: shiftUp 3 0'];
    const level = ok(parseLevel(levelText(hints), 'w1-01'));
    expect(level.meta.hints?.map((h) => h.glyph)).toEqual(['jump', 'shiftDown', 'shiftUp']);
    expect(level.meta.hints?.map((h) => h.anchor.col)).toEqual([9, 6, 3]);
    expect(MAX_LEVEL_HINTS).toBe(3);
    for (const glyph of HINT_GLYPHS) {
      expect(ok(parseLevel(levelText([`hint: ${glyph} 1 0`]), 'w1-01')).meta.hints).toEqual([
        { glyph, anchor: { col: 1, row: 0 } },
      ]);
    }
  });

  it('accepts hints between other header keys, with extra spaces and tabs', () => {
    const header = ['hint:   move\t1   0', 'id: w1-01', 'title: T', 'hint: jump 4 0', 'world: 1', 'teaches: t', 'version: 1'];
    const level = ok(parseLevel([...header, '---', ...GRID, ''].join('\n'), 'w1-01'));
    expect(level.meta.hints).toEqual([
      { glyph: 'move', anchor: { col: 1, row: 0 } },
      { glyph: 'jump', anchor: { col: 4, row: 0 } },
    ]);
  });

  it('parses a CRLF copy and a BOM copy identically', () => {
    const text = levelText(['hint: move 1 0', 'hint: jump 5 0']);
    const reference = ok(parseLevel(text, 'w1-01'));
    expect(ok(parseLevel(text.replace(/\n/g, '\r\n'), 'w1-01'))).toEqual(reference);
    expect(ok(parseLevel(`${BOM}${text.replace(/\n/g, '\r\n')}`, 'w1-01'))).toEqual(reference);
  });

  it('rejects more than MAX_LEVEL_HINTS, naming the fourth hint line', () => {
    const hints = ['hint: move 1 0', 'hint: jump 3 0', 'hint: shiftUp 5 0', 'hint: shiftDown 7 0'];
    expect(errors(parseLevel(levelText(hints), 'w1-01'))).toEqual([
      'w1-01.txt:9:1: too many hint lines (at most 3 per level)',
    ]);
  });

  it('rejects an unknown glyph id at the id column, listing the valid ids', () => {
    const e = errors(parseLevel(levelText(['hint:  fly 1 0']), 'w1-01'));
    expect(e).toEqual(["w1-01.txt:6:8: unknown hint glyph 'fly' (use move, shiftUp, shiftDown or jump)"]);
  });

  it('rejects a wrong token count at the value column', () => {
    expect(errors(parseLevel(levelText(['hint: move 1']), 'w1-01'))).toEqual([
      "w1-01.txt:6:7: hint needs '<glyph> <col> <row>' but found 'move 1'",
    ]);
    expect(errors(parseLevel(levelText(['hint: move 1 0 9']), 'w1-01'))[0]).toContain('w1-01.txt:6:7: hint needs');
    expect(errors(parseLevel(levelText(['hint:']), 'w1-01'))[0]).toMatch(/^w1-01\.txt:6:\d+: hint needs/);
  });

  it('rejects a non-integer or negative column and row at the token column', () => {
    expect(errors(parseLevel(levelText(['hint: move x 0']), 'w1-01'))).toEqual([
      "w1-01.txt:6:12: hint column must be a whole number of 0 or more, found 'x'",
    ]);
    expect(errors(parseLevel(levelText(['hint: move 1 -2']), 'w1-01'))).toEqual([
      "w1-01.txt:6:14: hint row must be a whole number of 0 or more, found '-2'",
    ]);
    expect(errors(parseLevel(levelText(['hint: move 1.5 0']), 'w1-01'))[0]).toContain('w1-01.txt:6:12:');
  });

  it('rejects an anchor outside the grid, naming the bad token column', () => {
    expect(errors(parseLevel(levelText(['hint: move 12 0']), 'w1-01'))).toEqual([
      'w1-01.txt:6:12: hint column 12 is outside the grid (columns 0 to 11)',
    ]);
    expect(errors(parseLevel(levelText(['hint: move 1 3']), 'w1-01'))).toEqual([
      'w1-01.txt:6:14: hint row 3 is outside the grid (rows 0 to 2)',
    ]);
  });

  it("rejects an anchor that is not '.', including the start and exit cells", () => {
    expect(errors(parseLevel(levelText(['hint: move 1 2']), 'w1-01'))).toEqual([
      "w1-01.txt:6:12: hint anchor (column 1, row 2) is '#', not '.'",
    ]);
    expect(errors(parseLevel(levelText(['hint: move 1 1']), 'w1-01'))[0]).toContain("is '@', not '.'");
    expect(errors(parseLevel(levelText(['hint: move 10 1']), 'w1-01'))[0]).toContain("is 'E', not '.'");
  });

  it('rejects an anchor on a twin start', () => {
    const grid = ['............', '.@&.......E.', '############'];
    expect(errors(parseLevel(levelText(['hint: move 2 1'], grid), 'w1-01'))[0]).toContain("is '&', not '.'");
  });

  it('rejects an exact duplicate hint, naming the first line', () => {
    const e = errors(parseLevel(levelText(['hint: move 1 0', 'hint: move 1 0']), 'w1-01'));
    expect(e).toEqual(['w1-01.txt:7:1: duplicate hint (the same glyph and anchor as line 6)']);
  });

  it('allows the same glyph at two different anchors', () => {
    const level = ok(parseLevel(levelText(['hint: shiftUp 1 0', 'hint: shiftUp 6 0']), 'w1-01'));
    expect(level.meta.hints).toHaveLength(2);
  });

  it('reports every bad hint, in file order', () => {
    const e = errors(parseLevel(levelText(['hint: fly 1 0', 'hint: move 99 0']), 'w1-01'));
    expect(e).toHaveLength(2);
    expect(e[0]).toContain(':6:');
    expect(e[1]).toContain(':7:');
  });

  it('does not change the tiles, the start or the other meta fields', () => {
    const plain = ok(parseLevel(levelText([]), 'w1-01'));
    const hinted = ok(parseLevel(levelText(['hint: move 1 0']), 'w1-01'));
    expect(hinted.tiles).toEqual(plain.tiles);
    expect(hinted.start).toEqual(plain.start);
    expect({ ...hinted.meta, hints: undefined }).toEqual({ ...plain.meta, hints: undefined });
  });
});
