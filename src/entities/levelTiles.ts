/**
 * Pure tile planning for the Tilemap layers: which tileset index goes in which
 * cell. Computed once per level (neighbour masks and safe depth), then the
 * coloured cells swap between `solid` and `ghost` when the held band changes.
 * Reserved kinds (ice, camera) draw as safe tiles, as before the cutover.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { ColoredBand, Level, Tile, TilePos } from '../core/types';
import { BAND_COLORS } from '../core/types';
import { EXIT_FRAMES, neighbourMask, tilesetIndex, type ColoredBandColor } from '../fx';

const MAX_SAFE_DEPTH = 4;
const EXIT_FRAME_MS = 150;

export interface ColoredCell {
  readonly col: number;
  readonly row: number;
  readonly band: ColoredBand;
  /** Tileset index while the tile holds the player. */
  readonly solid: number;
  /** Tileset index while it does not. */
  readonly ghost: number;
}

export interface LevelPlan {
  /** Row-major tileset indices of the static layer; -1 = empty. */
  readonly staticIndices: readonly number[];
  readonly colored: readonly ColoredCell[];
  readonly exits: readonly TilePos[];
}

const isSafeLike = (t: Tile | undefined): boolean => t !== undefined && (t.kind === 'safe' || t.kind === 'ice' || t.kind === 'camera');

function tileAt(level: Level, col: number, row: number): Tile | undefined {
  if (col < 0 || row < 0 || col >= level.width || row >= level.height) return undefined;
  return level.tiles[row * level.width + col];
}

type SameKind = (t: Tile | undefined) => boolean;

function maskAround(level: Level, col: number, row: number, same: SameKind): number {
  return neighbourMask({
    up: same(tileAt(level, col, row - 1)),
    right: same(tileAt(level, col + 1, row)),
    down: same(tileAt(level, col, row + 1)),
    left: same(tileAt(level, col - 1, row)),
  });
}

/** Number of safe tiles directly above, capped at 4. */
function safeDepth(level: Level, col: number, row: number): number {
  let depth = 0;
  while (depth < MAX_SAFE_DEPTH && isSafeLike(tileAt(level, col, row - 1 - depth))) depth += 1;
  return depth;
}

export function planLevel(level: Level): LevelPlan {
  const staticIndices: number[] = [];
  const colored: ColoredCell[] = [];
  const exits: TilePos[] = [];
  level.tiles.forEach((tile, i) => {
    const col = i % level.width;
    const row = Math.floor(i / level.width);
    let index = -1;
    if (isSafeLike(tile)) {
      index = tilesetIndex.safe(maskAround(level, col, row, isSafeLike), safeDepth(level, col, row));
    } else if (tile.kind === 'colored') {
      const band = BAND_COLORS[tile.band] as ColoredBandColor;
      const mask = maskAround(level, col, row, (t) => t?.kind === 'colored' && t.band === tile.band);
      colored.push({ col, row, band: tile.band, solid: tilesetIndex.solid(band, mask), ghost: tilesetIndex.ghost(band) });
    } else if (tile.kind === 'exit') {
      exits.push({ col, row });
    }
    staticIndices.push(index);
  });
  return { staticIndices, colored, exits };
}

/** Exit door frame: a slow loop, or held on the first frame under reduced motion. */
export function exitFrame(timeMs: number, reduced: boolean): number {
  if (reduced) return 0;
  return Math.floor(Math.max(0, timeMs) / EXIT_FRAME_MS) % EXIT_FRAMES;
}
