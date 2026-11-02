import { describe, expect, it } from 'vitest';
import { TILE_LEGEND, type Level, type ParseResult } from '../types';
import { parseLevel } from './index';

/** Copied from docs/tech/level-format.md section 3 (the doc itself stays untouched). */
const DOC_EXAMPLE = [
  '# Format example: one colored strip between safe floors.',
  'id: w0-01',
  'title: Blue Mile',
  'world: 0',
  'teaches: format example, walking (gear 1) over a blue floor',
  'version: 1',
  '---',
  '....................',
  '.@................E.',
  '#####BBBBBBBBB######',
  '',
].join('\n');

const HEADER = ['id: w1-01', 'title: Test', 'world: 1', 'teaches: nothing', 'version: 1'];

function levelText(grid: readonly string[], header: readonly string[] = HEADER): string {
  return [...header, '---', ...grid, ''].join('\n');
}

function ok(result: ParseResult<Level>): Level {
  if (!result.ok) throw new Error(`expected ok, got errors:\n${result.errors.join('\n')}`);
  return result.value;
}

function errors(result: ParseResult<Level>): readonly string[] {
  if (result.ok) throw new Error('expected errors, got a level');
  return result.errors;
}

describe('parseLevel: the documented example', () => {
  const level = ok(parseLevel(DOC_EXAMPLE, 'w0-01'));

  it('reads the header', () => {
    expect(level.meta).toEqual({
      id: 'w0-01',
      title: 'Blue Mile',
      world: 0,
      teaches: 'format example, walking (gear 1) over a blue floor',
      version: 1,
    });
  });

  it('reads the grid, the start and the exit', () => {
    expect(level.width).toBe(20);
    expect(level.height).toBe(3);
    expect(level.tiles).toHaveLength(60);
    expect(level.start).toEqual({ col: 1, row: 1 });
    expect(level.tiles[1 * 20 + 1]).toEqual({ kind: 'empty' });
    expect(level.tiles[1 * 20 + 18]).toEqual({ kind: 'exit' });
    expect(level.tiles[2 * 20 + 4]).toEqual({ kind: 'safe' });
    expect(level.tiles[2 * 20 + 5]).toEqual({ kind: 'colored', band: 1 });
    expect(level.tiles[2 * 20 + 13]).toEqual({ kind: 'colored', band: 1 });
    expect(level.tiles[2 * 20 + 14]).toEqual({ kind: 'safe' });
  });
});

describe('parseLevel: line endings and BOM', () => {
  const reference = ok(parseLevel(DOC_EXAMPLE, 'w0-01'));

  it('parses CRLF identically', () => {
    expect(ok(parseLevel(DOC_EXAMPLE.replace(/\n/g, '\r\n'), 'w0-01'))).toEqual(reference);
  });

  it('parses a leading BOM identically', () => {
    expect(ok(parseLevel(`﻿${DOC_EXAMPLE}`, 'w0-01'))).toEqual(reference);
  });

  it('parses BOM plus CRLF identically', () => {
    expect(ok(parseLevel(`﻿${DOC_EXAMPLE.replace(/\n/g, '\r\n')}`, 'w0-01'))).toEqual(reference);
  });

  it('parses a file without a final newline identically', () => {
    expect(ok(parseLevel(DOC_EXAMPLE.trimEnd(), 'w0-01'))).toEqual(reference);
  });

  it('never leaks a carriage return into header values', () => {
    const level = ok(parseLevel(DOC_EXAMPLE.replace(/\n/g, '\r\n'), 'w0-01'));
    expect(level.meta.teaches.endsWith('\r')).toBe(false);
    expect(level.meta.title).toBe('Blue Mile');
  });

  it('keeps line numbers right with CRLF and a BOM', () => {
    const text = `﻿${levelText(['@E', '#Q']).replace(/\n/g, '\r\n')}`;
    expect(errors(parseLevel(text, 'w1-01'))).toEqual([
      "w1-01.txt:8:2: unknown tile character 'Q' (see the legend in docs/tech/level-format.md)",
    ]);
  });
});

describe('parseLevel: every legend character', () => {
  it('maps each legend character to its tile (and @ to empty)', () => {
    const chars = Object.keys(TILE_LEGEND);
    const row = `@${chars.join('')}`;
    const level = ok(parseLevel(levelText([row]), 'w1-01'));
    expect(level.width).toBe(row.length);
    expect(level.tiles[0]).toEqual({ kind: 'empty' });
    chars.forEach((c, i) => expect(level.tiles[i + 1]).toEqual(TILE_LEGEND[c]));
  });
});

describe('parseLevel: header', () => {
  it('accepts any key order, blank lines and # comments', () => {
    const header = ['', '# note', 'version: 3', 'teaches: a: b', '', 'world: 2', 'title:   Spaced   ', 'id: w2-05'];
    const level = ok(parseLevel(levelText(['@E'], header), 'w2-05'));
    expect(level.meta).toEqual({ id: 'w2-05', title: 'Spaced', world: 2, teaches: 'a: b', version: 3 });
  });

  it('rejects an id that differs from the file stem, naming line and column', () => {
    const e = errors(parseLevel(levelText(['@E'], ['id: w1-02', ...HEADER.slice(1)]), 'w1-01'));
    expect(e).toEqual(["w1-01.txt:1:5: id 'w1-02' must equal the file name 'w1-01'"]);
  });

  it('reports every missing required key', () => {
    const e = errors(parseLevel(['id: w1-01', 'title: T', '---', '@E'].join('\n'), 'w1-01'));
    expect(e).toEqual([
      "w1-01.txt:3:1: missing required header key 'world'",
      "w1-01.txt:3:1: missing required header key 'teaches'",
      "w1-01.txt:3:1: missing required header key 'version'",
    ]);
  });

  it('rejects an unknown key and suggests the likely one', () => {
    const header = [...HEADER, 'titel: Oops'];
    const e = errors(parseLevel(levelText(['@E'], header), 'w1-01'));
    expect(e).toHaveLength(1);
    expect(e[0]).toContain("w1-01.txt:6:1: unknown header key 'titel'");
    expect(e[0]).toContain("did you mean 'title'?");
    expect(e[0]).toContain('id, title, world, teaches, version');
  });

  it('rejects a repeated key', () => {
    const e = errors(parseLevel(levelText(['@E'], [...HEADER, 'title: Again']), 'w1-01'));
    expect(e).toEqual(["w1-01.txt:6:1: header key 'title' is repeated (first set on line 2)"]);
  });

  it('rejects a header line without a colon', () => {
    const e = errors(parseLevel(levelText(['@E'], [...HEADER, 'just words']), 'w1-01'));
    expect(e).toEqual(["w1-01.txt:6:1: expected 'key: value' but found 'just words'"]);
  });

  it.each([
    ['world', 'world: 6', 'world must be an integer from 0 to 5'],
    ['world', 'world: one', 'world must be an integer from 0 to 5'],
    ['world', 'world: -1', 'world must be an integer from 0 to 5'],
    ['world', 'world: 1.5', 'world must be an integer from 0 to 5'],
    ['version', 'version: 0', 'version must be an integer of at least 1'],
    ['version', 'version: x', 'version must be an integer of at least 1'],
    ['version', 'version: 1.0', 'version must be an integer of at least 1'],
    ['title', 'title:', 'title must not be empty'],
    ['teaches', 'teaches:   ', 'teaches must not be empty'],
  ])('rejects a bad %s (%s)', (key, line, message) => {
    const header = HEADER.map((h) => (h.startsWith(`${key}:`) ? line : h));
    const e = errors(parseLevel(levelText(['@E'], header), 'w1-01'));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatch(/^w1-01\.txt:\d+:\d+: /);
    expect(e[0]).toContain(message);
  });

  it('rejects a missing --- separator', () => {
    const e = errors(parseLevel(HEADER.join('\n'), 'w1-01'));
    expect(e).toEqual(["w1-01.txt: missing the '---' line that ends the header and starts the grid"]);
  });

  it('accepts trailing spaces after ---', () => {
    ok(parseLevel(['id: w1-01', 'title: T', 'world: 1', 'teaches: t', 'version: 1', '---   ', '@E'].join('\n'), 'w1-01'));
  });
});

describe('parseLevel: grid', () => {
  it('ignores trailing blank lines but not blank lines inside the grid', () => {
    ok(parseLevel(`${levelText(['@E'])}\n\n  \n`, 'w1-01'));
    const e = errors(parseLevel(levelText(['@.', '', '#E']), 'w1-01'));
    expect(e).toEqual(['w1-01.txt:8:1: blank line inside the grid (rows must be contiguous)']);
  });

  it('rejects a blank line before the first row', () => {
    const e = errors(parseLevel(levelText(['', '@E']), 'w1-01'));
    expect(e).toEqual(['w1-01.txt:7:1: blank line inside the grid (rows must be contiguous)']);
  });

  it('rejects an empty grid', () => {
    expect(errors(parseLevel(levelText([]), 'w1-01'))).toEqual(['w1-01.txt:6:1: the grid is empty (nothing after the --- line)']);
  });

  it('rejects ragged rows with the row width found and expected', () => {
    const e = errors(parseLevel(levelText(['@..E', '#####', '###']), 'w1-01'));
    expect(e).toEqual([
      'w1-01.txt:8:5: row has 5 tiles but the first row has 4 (all rows must have the same width)',
      'w1-01.txt:9:4: row has 3 tiles but the first row has 4 (all rows must have the same width)',
    ]);
  });

  it('rejects unknown characters with line and column', () => {
    const e = errors(parseLevel(levelText(['@.Q.E', '#####', '..Z..']), 'w1-01'));
    expect(e).toEqual([
      "w1-01.txt:7:3: unknown tile character 'Q' (see the legend in docs/tech/level-format.md)",
      "w1-01.txt:9:3: unknown tile character 'Z' (see the legend in docs/tech/level-format.md)",
    ]);
  });

  it('names reserved characters', () => {
    const e = errors(parseLevel(levelText(['@XME']), 'w1-01'));
    expect(e).toEqual([
      "w1-01.txt:7:2: reserved character 'X' (crate) is not supported yet",
      "w1-01.txt:7:3: reserved character 'M' (moving platform) is not supported yet",
    ]);
  });

  it('describes spaces, tabs and non-ASCII characters readably', () => {
    const e = errors(parseLevel(levelText(['@ \tEé']), 'w1-01'));
    expect(e).toEqual([
      'w1-01.txt:7:2: unknown tile character space (see the legend in docs/tech/level-format.md)',
      'w1-01.txt:7:3: unknown tile character U+0009 (see the legend in docs/tech/level-format.md)',
      'w1-01.txt:7:5: unknown tile character U+00E9 (see the legend in docs/tech/level-format.md)',
    ]);
  });

  it('explains a second --- section is not supported yet', () => {
    const e = errors(parseLevel(levelText(['@E', '---', '...']), 'w1-01'));
    expect(e[0]).toBe("w1-01.txt:8:1: a second '---' section is not supported yet");
  });

  it('requires exactly one start', () => {
    expect(errors(parseLevel(levelText(['..E']), 'w1-01'))).toEqual([
      "w1-01.txt:7:1: no player start '@' in the grid (exactly one is required)",
    ]);
    const e = errors(parseLevel(levelText(['@.@E', '#@##']), 'w1-01'));
    expect(e).toEqual([
      "w1-01.txt:7:3: second player start '@' (the first is at line 7, column 1; exactly one is allowed)",
      "w1-01.txt:8:2: second player start '@' (the first is at line 7, column 1; exactly one is allowed)",
    ]);
  });

  it('requires at least one exit', () => {
    expect(errors(parseLevel(levelText(['@..']), 'w1-01'))).toEqual([
      "w1-01.txt:7:1: no exit 'E' in the grid (at least one is required)",
    ]);
  });

  it('allows several exits', () => {
    const level = ok(parseLevel(levelText(['E@E']), 'w1-01'));
    expect(level.tiles.filter((t) => t.kind === 'exit')).toHaveLength(2);
  });

  it('reports header and grid errors together, in file order', () => {
    const e = errors(parseLevel(levelText(['@Q'], ['id: w1-01', 'title: T', 'world: 9', 'teaches: t', 'version: 1']), 'w1-01'));
    expect(e).toHaveLength(3);
    expect(e[0]).toContain(':3:');
    expect(e[1]).toContain(':7:2');
    expect(e[2]).toContain('no exit');
  });

  it('caps a flood of errors', () => {
    const e = errors(parseLevel(levelText(['@'.padEnd(200, 'Q')]), 'w1-01'));
    expect(e.length).toBeLessThanOrEqual(26);
    expect(e[e.length - 1]).toMatch(/more errors? not shown/);
  });

  it('puts the start at the cell marked @ on any row', () => {
    const level = ok(parseLevel(levelText(['...E', '...#', '.@.#']), 'w1-01'));
    expect(level.start).toEqual({ col: 1, row: 2 });
    expect(level.height).toBe(3);
  });
});
