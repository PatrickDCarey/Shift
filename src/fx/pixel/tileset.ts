/**
 * The tileset grid for Phaser Tilemap layers: 16 x 16 cells, 16 columns, no margin and no
 * spacing, in a fixed index order. Phaser's tilemaps need a uniform grid image (the packed
 * `pixel-tiles` atlas is not one), so the same tile bakers are laid out here. Pure; no Phaser.
 * Owner: art-director.
 *
 * Phaser: `map.addTilesetImage('pixel-tileset', 'pixel-tileset', 16, 16, 0, 0)`; tile index = the
 * numbers below; `-1` is an empty cell. A colored cell swaps `solid(band, mask)` for `ghost(band)`
 * when the player's band changes.
 */
import type { BandColor } from '../../core/types';
import { BANDS } from './player';
import { blit, createRaster, type Raster } from './raster';
import { EXIT_FRAMES, NEIGHBOUR_MASKS, SAFE_DEPTHS, TILE, bakeExitDoor, bakeGhostTile, bakeSafeTile, bakeSolidTile, neighboursOf } from './tiles';

export const TILESET_COLUMNS = 16;
export type ColoredBand = Exclude<BandColor, 'white'>;
export const COLORED_BANDS: readonly ColoredBand[] = BANDS.filter((b): b is ColoredBand => b !== 'white');

const SAFE_COUNT = NEIGHBOUR_MASKS * SAFE_DEPTHS;
const SOLID_BASE = SAFE_COUNT;
const GHOST_BASE = SOLID_BASE + COLORED_BANDS.length * NEIGHBOUR_MASKS;
const EXIT_BASE = GHOST_BASE + COLORED_BANDS.length;
export const TILESET_COUNT = EXIT_BASE + EXIT_FRAMES;
export const TILESET_ROWS = Math.ceil(TILESET_COUNT / TILESET_COLUMNS);

const bandIndex = (band: ColoredBand): number => COLORED_BANDS.indexOf(band);

/** Tile index for each kind. `mask` bits: 0 up, 1 right, 2 down, 3 left = that neighbour is the same kind. `depth` 0 to 4 is the number of safe tiles above, capped. */
export const tilesetIndex = {
  safe: (mask: number, depth: number): number => mask * SAFE_DEPTHS + Math.min(Math.max(depth, 0), SAFE_DEPTHS - 1),
  solid: (band: ColoredBand, mask: number): number => SOLID_BASE + bandIndex(band) * NEIGHBOUR_MASKS + mask,
  ghost: (band: ColoredBand): number => GHOST_BASE + bandIndex(band),
  /** One door frame; the exit is normally a sprite (`tile/exit/door_<n>` in `pixel-tiles`), this is for static use. */
  exit: (frame: number): number => EXIT_BASE + (frame % EXIT_FRAMES),
} as const;

/** The baked cell for every index, in order. */
export function tilesetCells(): Raster[] {
  const cells: Raster[] = [];
  for (let mask = 0; mask < NEIGHBOUR_MASKS; mask++) {
    for (let depth = 0; depth < SAFE_DEPTHS; depth++) cells.push(bakeSafeTile(neighboursOf(mask), depth));
  }
  for (const band of COLORED_BANDS) for (let mask = 0; mask < NEIGHBOUR_MASKS; mask++) cells.push(bakeSolidTile(band, neighboursOf(mask)));
  for (const band of COLORED_BANDS) cells.push(bakeGhostTile(band));
  for (let f = 0; f < EXIT_FRAMES; f++) cells.push(bakeExitDoor(f));
  return cells;
}

export function bakeTileset(): Raster {
  const sheet = createRaster(TILESET_COLUMNS * TILE, TILESET_ROWS * TILE);
  tilesetCells().forEach((cell, i) => blit(sheet, cell, (i % TILESET_COLUMNS) * TILE, Math.floor(i / TILESET_COLUMNS) * TILE));
  return sheet;
}
