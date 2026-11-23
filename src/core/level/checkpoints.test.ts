import { describe, expect, it } from 'vitest';
import { MAX_CHECKPOINT_CLOCK, type Level, type ParseResult } from '../types';
import { parseLevel } from './index';

const BASE = ['id: w1-01', 'title: Test', 'world: 1', 'teaches: nothing', 'version: 1'];
const W = 200;

/** 200 wide, 10 tall: start col 1 and exit on row 8, safe floor on row 9. */
function grid(edit: (rows: string[][]) => void = () => undefined): string[] {
  const rows = Array.from({ length: 10 }, () => Array<string>(W).fill('.'));
  const at = (r: number): string[] => rows[r] as string[];
  at(8)[1] = '@';
  at(8)[W - 1] = 'E';
  at(9).fill('#');
  edit(rows);
  return rows.map((r) => r.join(''));
}

function text(lines: readonly string[], g: readonly string[] = grid(), eol = '\n'): string {
  return [...BASE, ...lines, '---', ...g, ''].join(eol);
}

function ok(r: ParseResult<Level>): Level {
  if (!r.ok) throw new Error(`expected ok:\n${r.errors.join('\n')}`);
  return r.value;
}

function errs(lines: readonly string[], g?: readonly string[]): readonly string[] {
  const r = parseLevel(text(lines, g), 'w1-01');
  if (r.ok) throw new Error('expected errors');
  return r.errors;
}

function has(e: readonly string[], re: RegExp): void {
  expect(e.some((m) => re.test(m)), e.join('\n')).toBe(true);
}

describe('checkpoint headers: happy paths', () => {
  it('parses the doc examples in file order', () => {
    const level = ok(parseLevel(text(['checkpoint: 30 8', 'checkpoint: 80 8 clock=0', 'checkpoint: 120 8 clock=36000']), 'w1-01'));
    expect(level.checkpoints).toEqual([
      { cell: { col: 30, row: 8 }, clock: 0 },
      { cell: { col: 80, row: 8 }, clock: 0 },
      { cell: { col: 120, row: 8 }, clock: MAX_CHECKPOINT_CLOCK },
    ]);
  });
  it('accepts exactly 20 columns from the start, exactly 40 apart and 4 posts', () => {
    const level = ok(parseLevel(text(['checkpoint: 21 8', 'checkpoint: 61 8', 'checkpoint: 101 8', 'checkpoint: 141 8']), 'w1-01'));
    expect(level.checkpoints).toHaveLength(4);
  });
  it('leaves checkpoints absent when there are none', () => {
    const level = ok(parseLevel(text([]), 'w1-01'));
    expect('checkpoints' in level).toBe(false);
  });
  it('parses CRLF files', () => {
    const level = ok(parseLevel(text(['checkpoint: 30 8 clock=5'], grid(), '\r\n'), 'w1-01'));
    expect(level.checkpoints).toEqual([{ cell: { col: 30, row: 8 }, clock: 5 }]);
  });
});

describe('checkpoint headers: errors', () => {
  it('rejects a wrong token count', () => {
    has(errs(['checkpoint: 30']), /w1-01\.txt:6:13: checkpoint needs/);
    has(errs(['checkpoint: 30 8 clock=1 x']), /checkpoint needs/);
  });
  it('rejects a key other than clock', () => {
    has(errs(['checkpoint: 30 8 phase=1']), /w1-01\.txt:6:18: unknown or malformed token 'phase=1'/);
  });
  it('rejects a clock out of range or malformed', () => {
    has(errs(['checkpoint: 30 8 clock=36001']), /6:24: clock must be a whole number from 0 to 36000/);
    has(errs(['checkpoint: 30 8 clock=-1']), /clock must be/);
    has(errs(['checkpoint: 30 8 clock=']), /clock must be/);
  });
  it('rejects non-integer or negative col/row', () => {
    has(errs(['checkpoint: x 8']), /6:13: checkpoint column must be a whole number/);
    has(errs(['checkpoint: 30 -1']), /6:16: checkpoint row must be a whole number/);
    has(errs(['checkpoint: 3.5 8']), /checkpoint column must be/);
  });
  it('rejects a cell outside the grid', () => {
    has(errs([`checkpoint: ${W} 8`]), /checkpoint column 200 is outside the grid/);
    has(errs(['checkpoint: 30 10']), /checkpoint row 10 is outside the grid/);
  });
  it('rejects a cell that is not a dot', () => {
    has(errs(['checkpoint: 30 9']), /is '#', not '\.'/);
    has(errs(['checkpoint: 1 8']), /is '@', not '\.'/);
  });
  it('rejects a post without a # below it', () => {
    has(errs(['checkpoint: 30 8'], grid((r) => ((r[9] as string[])[30] = '.'))), /needs a safe '#' directly below, found '\.'/);
    has(errs(['checkpoint: 30 8'], grid((r) => ((r[9] as string[])[30] = 'R'))), /directly below, found 'R'/);
  });
  it('rejects a post on the last row (nothing below the grid)', () => {
    const g = grid((r) => {
      r.pop();
      (r[8] as string[])[30] = '.';
    });
    has(errs(['checkpoint: 30 8'], g), /last row/);
  });
  it('rejects more than 4 posts', () => {
    const lines = ['checkpoint: 30 8', 'checkpoint: 70 8', 'checkpoint: 110 8', 'checkpoint: 150 8', 'checkpoint: 190 8'];
    has(errs(lines), /w1-01\.txt:10:1: too many checkpoint lines \(at most 4/);
  });
  it('rejects columns that do not strictly increase', () => {
    has(errs(['checkpoint: 80 8', 'checkpoint: 80 8']), /7:13: checkpoint column 80 must be right of the previous post/);
    has(errs(['checkpoint: 80 8', 'checkpoint: 30 8']), /columns strictly increase/);
  });
  it('rejects a first post under 20 columns from the start', () => {
    has(errs(['checkpoint: 20 8']), /6:13: the first checkpoint \(column 20\) is 19 columns right/);
  });
  it('rejects posts under 40 columns apart', () => {
    has(errs(['checkpoint: 30 8', 'checkpoint: 69 8']), /7:13: checkpoint column 69 is 39 columns after/);
  });
  it('rejects a twin, naming the twin line', () => {
    const g = grid((r) => ((r[8] as string[])[5] = '&'));
    has(errs(['checkpoint: 30 8'], g), /w1-01\.txt:\d+:6: twin start '&' in a level with checkpoint posts/);
  });
  it('rejects a sweep, naming the later line', () => {
    has(errs(['checkpoint: 30 8', 'sweep: x0=-6 speed=2 delay=90']), /w1-01\.txt:7:1: checkpoint posts and a sweep:/);
    has(errs(['sweep: x0=-6 speed=2 delay=90', 'checkpoint: 30 8']), /w1-01\.txt:7:1: checkpoint posts and a sweep:/);
  });
});
