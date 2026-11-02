/**
 * Player box and grid lookup. Tile (col, row) covers [col, col+1) x [row, row+1);
 * y grows down. Overlap is strict (touching edges do not overlap, GDD §4.1),
 * judged with SIM_EPSILON (architecture.md §3.3).
 */
import { SIM_EPSILON, type Level, type SimParams, type Tile } from '../types';

export interface Box {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Inclusive range of cell indices. Empty when last < first. */
export interface CellSpan {
  readonly first: number;
  readonly last: number;
}

const SAFE: Tile = { kind: 'safe' };
const EMPTY: Tile = { kind: 'empty' };

/** The player's box: x = feet centre, y = feet (bottom edge). */
export function boxAt(x: number, y: number, params: SimParams): Box {
  const half = params.playerWidth / 2;
  return { left: x - half, right: x + half, top: y - params.playerHeight, bottom: y };
}

/** Tile at a cell. Left, right and above the grid are safe; below it is open (GDD §4.11). */
export function tileAt(level: Level, col: number, row: number): Tile {
  if (row >= level.height) return EMPTY;
  if (row < 0 || col < 0 || col >= level.width) return SAFE;
  return level.tiles[row * level.width + col] ?? EMPTY;
}

/** Cells i strictly overlapping (lo, hi): i < hi - eps and i + 1 > lo + eps. */
export function cellSpan(lo: number, hi: number): CellSpan {
  return { first: Math.floor(lo + SIM_EPSILON), last: Math.ceil(hi - SIM_EPSILON) - 1 };
}

/** True if `pred` holds for some cell of the span (in ascending order). */
export function someCell(span: CellSpan, pred: (i: number) => boolean): boolean {
  for (let i = span.first; i <= span.last; i += 1) {
    if (pred(i)) return true;
  }
  return false;
}

/** True if some tile strictly overlapped by `box` satisfies `pred`. */
export function overlapsTile(level: Level, box: Box, pred: (tile: Tile) => boolean): boolean {
  const cols = cellSpan(box.left, box.right);
  return someCell(cellSpan(box.top, box.bottom), (row) => someCell(cols, (col) => pred(tileAt(level, col, row))));
}
