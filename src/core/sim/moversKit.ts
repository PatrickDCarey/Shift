/** TEST-ONLY builders for slab levels (hand-made `Level.movers`, no parser). */
import type { Level, Mover, MoverSolid, PathStep } from '../types';
import { gridLevel, row, type Placement } from './testkit';

const wait = (steps: number): PathStep => ({ kind: 'wait', steps });
const move = (dir: 'l' | 'r' | 'u' | 'd', tiles: number): PathStep => ({ kind: 'move', dir, tiles });

export function slab(
  col: number,
  rowIdx: number,
  width: number,
  path: readonly PathStep[],
  opts: { solid?: MoverSolid; speed?: 1 | 2 | 4 | 8; phase?: number } = {},
): Mover {
  return {
    origin: { col, row: rowIdx },
    width,
    height: 1,
    solid: opts.solid ?? { kind: 'safe' },
    path,
    speed: opts.speed ?? 2,
    phase: opts.phase ?? 0,
  };
}

/** Lift L: 3x1 safe, speed 2, path w60,u6,w60,d6 (cycle 312). */
export const liftPath: readonly PathStep[] = [wait(60), move('u', 6), wait(60), move('d', 6)];
/** Shuttle S: safe, speed 2, path w60,r12,w60,l12 (cycle 504). */
export const shuttlePath: readonly PathStep[] = [wait(60), move('r', 12), wait(60), move('l', 12)];
/** A slab that effectively rests for 600 steps (then r1, l1). */
export const restPath: readonly PathStep[] = [wait(600), move('r', 1), move('l', 1)];

/** Blank grid with `places` written over it, plus the movers. */
export function arena(width: number, height: number, places: readonly Placement[], movers: readonly Mover[]): Level {
  const rows = places.reduce(
    (acc, p) => acc.map((line, r) => (r === p.row ? line.slice(0, p.col) + p.chars + line.slice(p.col + p.chars.length) : line)),
    Array.from({ length: height }, () => row(width, '.')),
  );
  return { ...gridLevel(rows), movers };
}

/** Safe floor row across the whole width. */
export const floorRow = (width: number, r: number): Placement => ({ row: r, col: 0, chars: '#'.repeat(width) });
