/**
 * The Tilemap grid sheet: every tile has one unique index, the layout is a uniform 16 x 16 grid,
 * and a cell is exactly the baked tile.
 */
import { describe, expect, it } from 'vitest';
import { BAND_COLOR_LIST } from './player';
import { getPixel } from './raster';
import { NEIGHBOUR_MASKS, SAFE_DEPTHS, TILE, bakeGhostTile, bakeSafeTile, bakeSolidTile, neighboursOf } from './tiles';
import { COLORED_BANDS, TILESET_COLUMNS, TILESET_COUNT, TILESET_ROWS, bakeTileset, tilesetCells, tilesetIndex } from './tileset';

describe('tileset indices', () => {
  const all: number[] = [];
  for (let m = 0; m < NEIGHBOUR_MASKS; m++) for (let d = 0; d < SAFE_DEPTHS; d++) all.push(tilesetIndex.safe(m, d));
  for (const b of COLORED_BANDS) {
    for (let m = 0; m < NEIGHBOUR_MASKS; m++) all.push(tilesetIndex.solid(b, m));
    all.push(tilesetIndex.ghost(b));
  }
  for (let f = 0; f < 4; f++) all.push(tilesetIndex.exit(f));

  it('are unique and exactly cover 0 to count - 1', () => {
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort((a, b) => a - b)).toEqual(Array.from({ length: TILESET_COUNT }, (_, i) => i));
  });

  it('colored bands are blue, green, yellow and red (white has no tile)', () => {
    expect(COLORED_BANDS).toEqual(BAND_COLOR_LIST.filter((b) => b !== 'white'));
  });

  it('clamp the safe depth', () => {
    expect(tilesetIndex.safe(3, 99)).toBe(tilesetIndex.safe(3, SAFE_DEPTHS - 1));
  });
});

describe('tileset sheet', () => {
  const sheet = bakeTileset();

  it('is a 16-column grid of 16 x 16 cells with no margin', () => {
    expect([sheet.width, sheet.height]).toEqual([TILESET_COLUMNS * TILE, TILESET_ROWS * TILE]);
  });

  it('holds each baked tile at its index', () => {
    const cellAt = (i: number): number[] => {
      const out: number[] = [];
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) out.push(...getPixel(sheet, (i % TILESET_COLUMNS) * TILE + x, Math.floor(i / TILESET_COLUMNS) * TILE + y));
      return out;
    };
    const flat = (r: { data: Uint8ClampedArray }): number[] => Array.from(r.data);
    expect(cellAt(tilesetIndex.safe(5, 2))).toEqual(flat(bakeSafeTile(neighboursOf(5), 2)));
    expect(cellAt(tilesetIndex.solid('red', 9))).toEqual(flat(bakeSolidTile('red', neighboursOf(9))));
    expect(cellAt(tilesetIndex.ghost('green'))).toEqual(flat(bakeGhostTile('green')));
    expect(tilesetCells()).toHaveLength(TILESET_COUNT);
  });
});
