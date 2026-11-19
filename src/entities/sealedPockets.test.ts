import { describe, expect, it } from 'vitest';
import { parseLevel } from '../core';
import { LEVEL_FILES } from './levelFiles';
import { pocketAt, sealedPockets } from './sealedPockets';
import { gridLevel } from './testkit';

const pockets = (rows: readonly string[]) => sealedPockets(gridLevel(rows));

describe('sealedPockets (inline grids)', () => {
  it('finds a box closed by safe tiles on every side', () => {
    const found = pockets(['.@...E', '######', '#....#', '#....#', '######', '......']);
    expect(found).toHaveLength(1);
    expect(found[0]?.bounds).toEqual({ minCol: 1, maxCol: 4, minRow: 2, maxRow: 3 });
  });

  it('is not a pocket when it reaches the bottom row (a pit)', () => {
    expect(pockets(['.@..E', '#####', '#...#', '#.#.#', '#...#'])).toHaveLength(0);
    expect(pockets(['.@..E', '#####', '#...#', '#...#', '##.##'])).toHaveLength(0);
  });

  it('is not a pocket when it reaches the top row (open sky)', () => {
    expect(pockets(['#....#', '#.@E.#', '######'])).toHaveLength(0);
  });

  it('is not a pocket when it holds a spawn or an exit', () => {
    expect(pockets(['.....', '#####', '#.E.#', '#####', '.@...'])).toHaveLength(0);
    expect(pockets(['.E...', '#####', '#.@.#', '#####', '.....'])).toHaveLength(0);
    expect(pockets(['.E...', '#####', '#.&.#', '#####', '.@...'])).toHaveLength(0);
  });

  it('counts coloured tiles as boundaries (a body can pass them, so the air below is closed)', () => {
    expect(pockets(['.@..E', 'BBBBB', '#...#', '#####', '.....'])).toHaveLength(1);
  });

  it('is sealed when closed on top by coloured tiles and on the sides by safe tiles', () => {
    const found = pockets(['.@..E', 'GGGGG', '#...#', '#...#', '#####', '.....']);
    expect(found).toHaveLength(1);
  });

  it('answers which pocket holds a cell', () => {
    const found = pockets(['.@...E', '######', '#....#', '######', '......']);
    expect(pocketAt(found, 2, 2)).toBe(0);
    expect(pocketAt(found, 0, 2)).toBe(-1);
    expect(pocketAt(found, 2, 0)).toBe(-1);
    expect(pocketAt(found, -1, 2)).toBe(-1);
  });
});

describe('sealedPockets (shipped levels)', () => {
  const byId = new Map<string, ReturnType<typeof sealedPockets>>();
  for (const [path, text] of Object.entries(LEVEL_FILES)) {
    const id = /([^/]+)\.txt$/.exec(path)?.[1] ?? path;
    const parsed = parseLevel(text, id);
    if (!parsed.ok) throw new Error(`${id}: ${parsed.errors.join('; ')}`);
    byId.set(id, sealedPockets(parsed.value));
  }

  it('w3-02 has exactly one pocket, rows 7-9, cols 10-25', () => {
    const found = byId.get('w3-02') ?? [];
    expect(found).toHaveLength(1);
    expect(found[0]?.bounds).toEqual({ minCol: 10, maxCol: 25, minRow: 7, maxRow: 9 });
  });

  it('w3-03 has exactly one pocket, rows 7-9, cols 25-34', () => {
    const found = byId.get('w3-03') ?? [];
    expect(found).toHaveLength(1);
    expect(found[0]?.bounds).toEqual({ minCol: 25, maxCol: 34, minRow: 7, maxRow: 9 });
  });

  it('no other shipped level has one', () => {
    const others = [...byId].filter(([id, p]) => id !== 'w3-02' && id !== 'w3-03' && p.length > 0).map(([id]) => id);
    expect(others).toEqual([]);
    expect(byId.size).toBeGreaterThanOrEqual(14);
  });
});
