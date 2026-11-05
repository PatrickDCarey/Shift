import { describe, expect, it } from 'vitest';
import type { Level, ParseResult } from '../types';
import { parseLevel } from './index';

const HEADER = ['id: w3-01', 'title: Test', 'world: 3', 'teaches: nothing', 'version: 1'];
const BOM = '﻿';

function levelText(grid: readonly string[]): string {
  return [...HEADER, '---', ...grid, ''].join('\n');
}

function ok(result: ParseResult<Level>): Level {
  if (!result.ok) throw new Error(`expected ok, got errors:\n${result.errors.join('\n')}`);
  return result.value;
}

function errors(result: ParseResult<Level>): readonly string[] {
  if (result.ok) throw new Error('expected errors, got a level');
  return result.errors;
}

describe('parseLevel: twin start &', () => {
  it('has no twin start in a level without &', () => {
    expect(ok(parseLevel(levelText(['@.E']), 'w3-01')).twinStart).toBeNull();
  });

  it('reads & into twinStart and parses its cell as empty', () => {
    const level = ok(parseLevel(levelText(['....E', '.@.&.', '#####']), 'w3-01'));
    expect(level.twinStart).toEqual({ col: 3, row: 1 });
    expect(level.start).toEqual({ col: 1, row: 1 });
    expect(level.tiles[1 * 5 + 3]).toEqual({ kind: 'empty' });
    expect(level.width).toBe(5);
  });

  it('allows the twin on any row, above or left of the player', () => {
    const level = ok(parseLevel(levelText(['&...E', '.@...', '#####']), 'w3-01'));
    expect(level.twinStart).toEqual({ col: 0, row: 0 });
  });

  it('rejects a second &, naming its row and column and the first', () => {
    const e = errors(parseLevel(levelText(['@.&.E', '.&...', '#####']), 'w3-01'));
    expect(e).toEqual([
      "w3-01.txt:8:2: second twin start '&' (the first is at line 7, column 3; at most one is allowed)",
    ]);
  });

  it('reports every extra &', () => {
    const e = errors(parseLevel(levelText(['@&&&E']), 'w3-01'));
    expect(e).toHaveLength(2);
    expect(e[0]).toContain('w3-01.txt:7:3:');
    expect(e[1]).toContain('w3-01.txt:7:4:');
  });

  it('rejects an E directly above &, naming the & row and column', () => {
    const e = errors(parseLevel(levelText(['@.E..', '..&..', '#####']), 'w3-01'));
    expect(e).toEqual(["w3-01.txt:8:3: twin start '&' has an exit 'E' directly above it (the twin would finish on step 1)"]);
  });

  it('rejects an E directly below &, naming the & row and column', () => {
    const e = errors(parseLevel(levelText(['@.&..', '..E..', '#####']), 'w3-01'));
    expect(e).toEqual(["w3-01.txt:7:3: twin start '&' has an exit 'E' directly below it (the twin would fall into it)"]);
  });

  it('allows an E beside the &, or two rows away', () => {
    expect(ok(parseLevel(levelText(['@.&E.', '.....', '#####']), 'w3-01')).twinStart).toEqual({ col: 2, row: 0 });
    expect(ok(parseLevel(levelText(['@E...', '.....', '..&..', '#####']), 'w3-01')).twinStart).toEqual({ col: 2, row: 2 });
  });

  it('parses a CRLF copy and a BOM copy identically', () => {
    const text = levelText(['....E', '.@.&.', '#####']);
    const reference = ok(parseLevel(text, 'w3-01'));
    expect(ok(parseLevel(text.replace(/\n/g, '\r\n'), 'w3-01'))).toEqual(reference);
    expect(ok(parseLevel(`${BOM}${text.replace(/\n/g, '\r\n')}`, 'w3-01'))).toEqual(reference);
  });

  it('still requires a player start even when & is present', () => {
    const e = errors(parseLevel(levelText(['.&.E']), 'w3-01'));
    expect(e[0]).toContain("no player start '@'");
  });

  it('counts & as a tile for the ragged-row check', () => {
    const e = errors(parseLevel(levelText(['@.&E', '..']), 'w3-01'));
    expect(e[0]).toContain('row has 2 tiles but the first row has 4');
  });
});
