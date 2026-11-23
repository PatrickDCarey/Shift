/**
 * Sealed pockets (restart-prompt.md): closed air regions a body can fall into and
 * never leave. Pure, computed once per level from the grid alone (hints and
 * solutions are never read). A region is a 4-connected set of empty, spawn or
 * exit cells; it is sealed when it has no spawn, no exit, no cell a slab sweeps (a rider
 * can leave on it) and touches neither the top nor the bottom row. Safe, coloured, ice and gate tiles are its boundary.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { Level } from '../core/types';
import { sweptCells } from './kineticsPlan';

export interface PocketBounds {
  readonly minCol: number;
  readonly maxCol: number;
  readonly minRow: number;
  readonly maxRow: number;
}

export interface SealedPocket {
  /** Row-major cell indices (row * width + col). */
  readonly cells: ReadonlySet<number>;
  readonly bounds: PocketBounds;
  /** Width of the level grid the cell indices refer to. */
  readonly width: number;
}

const NEIGHBOURS: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function openCells(level: Level): boolean[] {
  const open = level.tiles.map((t) => t.kind === 'empty' || t.kind === 'exit');
  const spawns = level.twinStart === null ? [level.start] : [level.start, level.twinStart];
  for (const s of spawns) open[s.row * level.width + s.col] = true;
  return open;
}

/** Flood one region from `from`; marks `seen`. Returns its cells and whether it leaks or holds a spawn/exit. */
function flood(level: Level, open: readonly boolean[], seen: boolean[], from: number, special: ReadonlySet<number>) {
  const { width, height } = level;
  const cells = new Set<number>();
  const stack = [from];
  seen[from] = true;
  let sealed = true;
  while (stack.length > 0) {
    const i = stack.pop() as number;
    cells.add(i);
    const col = i % width;
    const row = Math.floor(i / width);
    if (special.has(i) || row === 0 || row === height - 1) sealed = false;
    for (const [dc, dr] of NEIGHBOURS) {
      const c = col + dc;
      const r = row + dr;
      const n = r * width + c;
      if (c < 0 || r < 0 || c >= width || r >= height || seen[n] === true || open[n] !== true) continue;
      seen[n] = true;
      stack.push(n);
    }
  }
  return { cells, sealed };
}

function boundsOf(cells: ReadonlySet<number>, width: number): PocketBounds {
  const cols = [...cells].map((i) => i % width);
  const rows = [...cells].map((i) => Math.floor(i / width));
  return { minCol: Math.min(...cols), maxCol: Math.max(...cols), minRow: Math.min(...rows), maxRow: Math.max(...rows) };
}

export function sealedPockets(level: Level): readonly SealedPocket[] {
  const open = openCells(level);
  const special = new Set<number>();
  level.tiles.forEach((t, i) => t.kind === 'exit' && special.add(i));
  for (const m of level.movers ?? []) sweptCells(m, level.width).forEach((c) => special.add(c));
  special.add(level.start.row * level.width + level.start.col);
  if (level.twinStart !== null) special.add(level.twinStart.row * level.width + level.twinStart.col);
  const seen: boolean[] = [];
  const out: SealedPocket[] = [];
  open.forEach((isOpen, i) => {
    if (!isOpen || seen[i] === true) return;
    const region = flood(level, open, seen, i, special);
    if (region.sealed) out.push({ cells: region.cells, bounds: boundsOf(region.cells, level.width), width: level.width });
  });
  return out;
}

/** Index of the pocket holding the cell, or -1. */
export function pocketAt(pockets: readonly SealedPocket[], col: number, row: number): number {
  return pockets.findIndex((p) => col >= 0 && row >= 0 && col < p.width && p.cells.has(row * p.width + col));
}
