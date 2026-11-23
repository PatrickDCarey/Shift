/**
 * Kinetic path maths (expansion): movers, emitter shots, the sweep. Pure
 * functions of the run step t; clock and arithmetic rules in
 * src/core/contracts/kinetics.ts (speeds are n/32 tile per step, all results
 * exact multiples of 1/32).
 */
import {
  KIN_SPEED_UNIT,
  type Emitter,
  type KinDir,
  type Mover,
  type PathStep,
  type Shot,
  type Sweep,
  type TileVec,
} from '../types';

const DIR_VEC: Readonly<Record<KinDir, TileVec>> = {
  l: { x: -1, y: 0 },
  r: { x: 1, y: 0 },
  u: { x: 0, y: -1 },
  d: { x: 0, y: 1 },
};

function stepLength(token: PathStep, speed: number): number {
  return token.kind === 'wait' ? token.steps : (token.tiles * KIN_SPEED_UNIT) / speed;
}

/** Steps in one loop of the mover's path. */
export function moverCycle(mover: Mover): number {
  let total = 0;
  for (const token of mover.path) total += stepLength(token, mover.speed);
  return total;
}

/** Offset of the slab's top-left from its origin at run step t, tiles. */
export function moverOffset(mover: Mover, t: number): TileVec {
  let u = (t + mover.phase) % moverCycle(mover);
  let x = 0;
  let y = 0;
  for (const token of mover.path) {
    const len = stepLength(token, mover.speed);
    if (token.kind === 'move') {
      const d = DIR_VEC[token.dir];
      const tiles = (Math.min(u, len) * mover.speed) / KIN_SPEED_UNIT;
      x += d.x * tiles;
      y += d.y * tiles;
    }
    if (u < len) break;
    u -= len;
  }
  return { x, y };
}

/** Whole-tile offsets at the start of each move token and at the loop's end. */
export function moverCorners(mover: Mover): readonly TileVec[] {
  const corners: TileVec[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  for (const token of mover.path) {
    if (token.kind !== 'move') continue;
    const d = DIR_VEC[token.dir];
    x += d.x * token.tiles;
    y += d.y * token.tiles;
    corners.push({ x, y });
  }
  return corners;
}

/** Shots alive at run step t, oldest first. */
export function shotsAt(e: Emitter, t: number): readonly Shot[] {
  const life = (e.range * KIN_SPEED_UNIT) / e.speed;
  const lo = Math.max(0, t - life + 1);
  const first = lo + ((e.period - ((lo + e.phase) % e.period)) % e.period);
  const d = DIR_VEC[e.dir];
  const shots: Shot[] = [];
  for (let s = first; s <= t; s += e.period) {
    const dist = ((t - s) * e.speed) / KIN_SPEED_UNIT;
    shots.push({ x: e.cell.col + 0.5 + d.x * dist, y: e.cell.row + 0.5 + d.y * dist, firedAt: s });
  }
  return shots;
}

/** Steps from run step t until the next shot leaves (0 = one leaves at t). */
export function nextShotIn(e: Emitter, t: number): number {
  return (e.period - ((t + e.phase) % e.period)) % e.period;
}

/** Sweep front x at run step t, tiles, clamped to the level width. */
export function sweepFront(sw: Sweep, t: number, width: number): number {
  return Math.min(width, sw.x0 + (sw.speed * Math.max(0, t - sw.delay)) / KIN_SPEED_UNIT);
}
