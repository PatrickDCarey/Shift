/**
 * Axis-separated tile collision (phases 7-8). Moves per step are well under
 * a tile, but the sweeps walk every crossed face so larger moves stay correct.
 * Reaching a face within SIM_EPSILON counts as contact; contacts snap exactly
 * to the face (architecture.md §3.3).
 */
import { SIM_EPSILON, type Level, type SimParams } from '../types';
import { boxAt, cellSpan, overlapsTile, someCell, tileAt } from './geometry';
import { solidAll, solidFloor, type Gate } from './gating';

export { overlapsTile };

export interface SweepXResult {
  readonly x: number;
  readonly blocked: boolean;
}

export type YHit = 'floor' | 'ceiling' | null;

export interface SweepYResult {
  readonly y: number;
  readonly hit: YHit;
}

/** Phase 7: move the box by dx at height y; walls use solidAll (no grace). */
export function sweepX(level: Level, params: SimParams, x: number, y: number, dx: number, gate: Gate): SweepXResult {
  const box = boxAt(x, y, params);
  const rows = cellSpan(box.top, box.bottom);
  const wall = (col: number): boolean => someCell(rows, (row) => solidAll(tileAt(level, col, row), gate));
  const half = params.playerWidth / 2;
  if (dx > 0) {
    const end = box.right + dx;
    for (let col = Math.ceil(box.right - SIM_EPSILON); col <= end + SIM_EPSILON; col += 1) {
      if (wall(col)) return { x: col - half, blocked: true };
    }
  } else if (dx < 0) {
    const end = box.left + dx;
    for (let face = Math.floor(box.left + SIM_EPSILON); face >= end - SIM_EPSILON; face -= 1) {
      if (wall(face - 1)) return { x: face + half, blocked: true };
    }
  }
  return { x: x + dx, blocked: false };
}

/** Phase 8: move the box by dy at x; floors use solidFloor (grace), ceilings solidAll. */
export function sweepY(level: Level, params: SimParams, x: number, y: number, dy: number, gate: Gate): SweepYResult {
  const box = boxAt(x, y, params);
  const cols = cellSpan(box.left, box.right);
  if (dy > 0) {
    const end = box.bottom + dy;
    for (let row = Math.ceil(box.bottom - SIM_EPSILON); row <= end + SIM_EPSILON; row += 1) {
      if (someCell(cols, (col) => solidFloor(tileAt(level, col, row), gate))) return { y: row, hit: 'floor' };
    }
  } else if (dy < 0) {
    const end = box.top + dy;
    for (let face = Math.floor(box.top + SIM_EPSILON); face >= end - SIM_EPSILON; face -= 1) {
      if (someCell(cols, (col) => solidAll(tileAt(level, col, face - 1), gate))) {
        return { y: face + params.playerHeight, hit: 'ceiling' };
      }
    }
  }
  return { y: y + dy, hit: null };
}

/** Supported (GDD §4.7): a floor-solid tile's top is level with the feet under the box. */
export function supported(level: Level, params: SimParams, x: number, y: number, gate: Gate): boolean {
  const row = Math.round(y);
  if (Math.abs(y - row) > SIM_EPSILON) return false;
  const box = boxAt(x, y, params);
  return someCell(cellSpan(box.left, box.right), (col) => solidFloor(tileAt(level, col, row), gate));
}
