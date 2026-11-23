import { describe, expect, it } from 'vitest';
import type { Emitter, Mover, PathStep, Sweep } from '../types';
import { moverCorners, moverCycle, moverOffset, nextShotIn, shotsAt, sweepFront } from './paths';

const w = (steps: number): PathStep => ({ kind: 'wait', steps });
const mv = (dir: 'l' | 'r' | 'u' | 'd', tiles: number): PathStep => ({ kind: 'move', dir, tiles });

const liftL = (phase = 0): Mover => ({
  origin: { col: 4, row: 10 },
  width: 3,
  height: 1,
  solid: { kind: 'safe' },
  path: [w(60), mv('u', 6), w(60), mv('d', 6)],
  speed: 2,
  phase,
});
const shuttle: Mover = {
  origin: { col: 0, row: 0 },
  width: 8,
  height: 1,
  solid: { kind: 'safe' },
  path: [w(60), mv('r', 12), w(60), mv('l', 12)],
  speed: 2,
  phase: 0,
};
const roomB: Emitter = {
  cell: { col: 20, row: 5 },
  dir: 'l',
  range: 12,
  speed: 4,
  period: 300,
  phase: 0,
  band: null,
};

describe('movers (moving-objects check 1)', () => {
  it('cycle lengths', () => {
    expect(moverCycle(liftL())).toBe(312);
    expect(moverCycle(shuttle)).toBe(504);
  });

  it.each([
    [0, 0],
    [60, 0],
    [108, -3],
    [156, -6],
    [216, -6],
    [264, -3],
    [312, 0],
    [372, 0],
  ])('Lift L offset y at t=%i is %f', (t, y) => {
    expect(moverOffset(liftL(), t)).toEqual({ x: 0, y });
  });

  it('phase 108 starts at 3.0', () => {
    expect(moverOffset(liftL(108), 0).y).toBe(-3);
  });

  it('horizontal legs move along x', () => {
    expect(moverOffset(shuttle, 60 + 96)).toEqual({ x: 6, y: 0 });
    expect(moverOffset(shuttle, 60 + 192 + 60 + 96)).toEqual({ x: 6, y: 0 });
  });

  it('positions are multiples of 1/32 and wrap with the cycle', () => {
    for (let t = 0; t < 700; t++) {
      const o = moverOffset(liftL(), t);
      expect(o.y * 32).toBe(Math.round(o.y * 32));
      expect(moverOffset(liftL(), t + 312)).toEqual(o);
    }
  });

  it('t = 0 is the origin for phase 0', () => {
    expect(moverOffset(shuttle, 0)).toEqual({ x: 0, y: 0 });
  });

  it('corners', () => {
    expect(moverCorners(liftL())).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: -6 },
      { x: 0, y: 0 },
    ]);
  });
});

describe('shots (projectiles Room B)', () => {
  it('shot s=0 centre x = 20.5 - 0.125 t, life 96', () => {
    expect(shotsAt(roomB, 0)).toEqual([{ x: 20.5, y: 5.5, firedAt: 0 }]);
    expect(shotsAt(roomB, 76)[0]).toEqual({ x: 20.5 - 0.125 * 76, y: 5.5, firedAt: 0 });
    expect(shotsAt(roomB, 95)).toHaveLength(1);
    expect(shotsAt(roomB, 96)).toHaveLength(0);
  });

  it('several shots oldest first; vertical dirs', () => {
    const e: Emitter = { ...roomB, period: 12, range: 1, speed: 4, dir: 'd', cell: { col: 1, row: 2 } };
    const s = shotsAt(e, 30);
    expect(s.map((x) => x.firedAt)).toEqual([24]);
    expect(s[0]).toEqual({ x: 1.5, y: 2.5 + 6 * 0.125, firedAt: 24 });
    const up = shotsAt({ ...e, dir: 'u', range: 12 }, 12);
    expect(up.map((x) => x.firedAt)).toEqual([0, 12]);
    expect(up[0]?.y).toBe(2.5 - 1.5);
  });

  it('phase offsets shots; none before s = 0', () => {
    const e: Emitter = { ...roomB, phase: 100, dir: 'r' };
    expect(shotsAt(e, 150)).toHaveLength(0);
    expect(shotsAt(e, 200)[0]?.firedAt).toBe(200);
    expect(shotsAt(e, 250)[0]).toEqual({ x: 20.5 + 50 * 0.125, y: 5.5, firedAt: 200 });
  });

  it('nextShotIn', () => {
    expect(nextShotIn(roomB, 0)).toBe(0);
    expect(nextShotIn(roomB, 1)).toBe(299);
    expect(nextShotIn(roomB, 300)).toBe(0);
    expect(nextShotIn({ ...roomB, phase: 100 }, 0)).toBe(200);
  });
});

describe('sweep (sweep checks 1-2)', () => {
  const sw: Sweep = { x0: 0, speed: 2, delay: 90 };
  it('formula', () => {
    expect(sweepFront(sw, 0, 100)).toBe(0);
    expect(sweepFront(sw, 90, 100)).toBe(0);
    expect(sweepFront(sw, 91, 100)).toBe(0.0625);
    expect(sweepFront(sw, 190, 100)).toBe(6.25);
    expect(sweepFront(sw, 226, 100)).toBe(8.5);
    expect(sweepFront(sw, 225, 100)).toBe(8.4375);
  });
  it('clamps to width, allows off-grid start', () => {
    expect(sweepFront(sw, 100000, 40)).toBe(40);
    expect(sweepFront({ x0: -10, speed: 1, delay: 0 }, 0, 40)).toBe(-10);
  });
});
