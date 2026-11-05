import { describe, expect, it } from 'vitest';
import type { Tile } from '../types';
import { overlapsTile, supported, sweepX, sweepY } from './collision';
import { boxAt, cellSpan, tileAt } from './geometry';
import { embeddedBands, gateFor, solidAll, solidFloor } from './gating';
import { gridLevel, params } from './testkit';

const NONE = [false, false, false, false, false] as const;
const gate = (band: 0 | 1 | 2 | 3 | 4, graceBand: 1 | 2 | 3 | 4 | null = null) => ({ band, graceBand, embedded: NONE });

describe('geometry', () => {
  it('box: feet centre x, feet y, 0.75 x 1.5', () => {
    expect(boxAt(2.5, 10, params)).toEqual({ left: 2.125, right: 2.875, top: 8.5, bottom: 10 });
  });

  it('cellSpan lists strictly overlapped cells (touching edges excluded)', () => {
    expect(cellSpan(2.625, 3.375)).toEqual({ first: 2, last: 3 });
    expect(cellSpan(2, 2.75)).toEqual({ first: 2, last: 2 });
    expect(cellSpan(1.25, 2)).toEqual({ first: 1, last: 1 });
    expect(cellSpan(1.9999999999, 3)).toEqual({ first: 2, last: 2 });
  });

  it('tileAt: left, right and top bounds are safe, below the grid is empty', () => {
    const level = gridLevel(['.@.', '#B#']);
    expect(tileAt(level, 1, 1)).toEqual({ kind: 'colored', band: 1 });
    expect(tileAt(level, -1, 0).kind).toBe('safe');
    expect(tileAt(level, 3, 1).kind).toBe('safe');
    expect(tileAt(level, 1, -1).kind).toBe('safe');
    expect(tileAt(level, 1, 2).kind).toBe('empty');
    expect(tileAt(level, -1, 5).kind).toBe('empty');
  });
});

describe('gating', () => {
  const blue: Tile = { kind: 'colored', band: 1 };
  it('colored tiles are solid only when the band matches and not embedded', () => {
    expect(solidAll(blue, gate(1))).toBe(true);
    expect(solidAll(blue, gate(2))).toBe(false);
    expect(solidAll(blue, { band: 1, graceBand: null, embedded: [false, true, false, false, false] })).toBe(false);
  });

  it('safe and reserved always-solid tiles are solid; empty and exit never', () => {
    for (const kind of ['safe', 'ice'] as const) expect(solidAll({ kind }, gate(0))).toBe(true);
    expect(solidAll({ kind: 'empty' }, gate(3))).toBe(false);
    expect(solidAll({ kind: 'exit' }, gate(3))).toBe(false);
  });

  it('cameras are solid unless the band matches', () => {
    expect(solidAll({ kind: 'camera', band: 2 }, gate(2))).toBe(false);
    expect(solidAll({ kind: 'camera', band: 2 }, gate(3))).toBe(true);
  });

  it('grace makes the grace colour floor-solid only', () => {
    expect(solidFloor(blue, gate(0, 1))).toBe(true);
    expect(solidAll(blue, gate(0, 1))).toBe(false);
    expect(solidFloor(blue, gate(0, 2))).toBe(false);
  });

  it('embeddedBands flags every colour the box overlaps', () => {
    const level = gridLevel(['.YG.', '.YG.', '@...']);
    expect(embeddedBands(level, boxAt(2, 2, params))).toEqual([false, false, true, true, false]);
    expect(gateFor(level, params, 2, 2, 3, null).embedded).toEqual([false, false, true, true, false]);
  });
});

describe('sweeps', () => {
  const level = gridLevel(['......', '..#...', '......', '@....#', '######']);
  it('stops at a wall face moving right and left, snapping exactly', () => {
    expect(sweepX(level, params, 4.5, 4, 0.2, gate(0))).toEqual({ x: 4.625, blocked: true });
    expect(sweepX(level, params, 4.6, 4, 0.1, gate(0))).toEqual({ x: 4.625, blocked: true });
    expect(sweepX(level, params, 0.5, 4, -0.2, gate(0))).toEqual({ x: 0.375, blocked: true });
    expect(sweepX(level, params, 2.5, 4, 0.1, gate(0))).toEqual({ x: 2.6, blocked: false });
    expect(sweepX(level, params, 2.5, 4, 0, gate(0))).toEqual({ x: 2.5, blocked: false });
  });

  it('lands on floors and bonks ceilings', () => {
    expect(sweepY(level, params, 0.5, 3.9, 0.2, gate(0))).toEqual({ y: 4, hit: 'floor' });
    expect(sweepY(level, params, 2.5, 3.6, -0.2, gate(0))).toEqual({ y: 3.5, hit: 'ceiling' });
    expect(sweepY(level, params, 2.5, 1.6, -0.2, gate(0))).toEqual({ y: 1.5, hit: 'ceiling' });
    expect(sweepY(level, params, 4.5, 3, 0.2, gate(0))).toEqual({ y: 3.2, hit: null });
  });

  it('supported: a floor-solid tile level with the feet under the box', () => {
    expect(supported(level, params, 0.5, 4, gate(0))).toBe(true);
    expect(supported(level, params, 0.5, 3.5, gate(0))).toBe(false);
    expect(supported(level, params, 0.5, 4 + 1e-12, gate(0))).toBe(true);
  });

  it('overlapsTile finds exits strictly overlapped', () => {
    const exit = gridLevel(['.E', '@.']);
    const isExit = (t: Tile): boolean => t.kind === 'exit';
    expect(overlapsTile(exit, boxAt(0.5, 2, params), isExit)).toBe(false);
    expect(overlapsTile(exit, boxAt(0.625, 2, params), isExit)).toBe(false);
    expect(overlapsTile(exit, boxAt(0.7, 2, params), isExit)).toBe(true);
    expect(overlapsTile(exit, boxAt(0.7, 2.5, params), isExit)).toBe(false);
  });
});
