import { describe, expect, it } from 'vitest';
import type { Emitter, Level, Mover, SimState } from '../core/types';
import { emitterTell, kineticsSnapshot, planKinetics, planShots, renderTime, slabHolds, sweptCells, trackCells, type PlanOptions } from './kineticsPlan';
import { gridLevel } from './testkit';

const OPTS: PlanOptions = { tileSize: 16, tellSteps: 18, bodyWidthTiles: 0.75, bodyHeightTiles: 1.5, shotSizeTiles: 0.5 };

const LIFT: Mover = {
  origin: { col: 5, row: 4 },
  width: 3,
  height: 1,
  solid: { kind: 'safe' },
  path: [{ kind: 'wait', steps: 60 }, { kind: 'move', dir: 'u', tiles: 6 }, { kind: 'wait', steps: 60 }, { kind: 'move', dir: 'd', tiles: 6 }],
  speed: 2,
  phase: 0,
};
const GREEN: Mover = { ...LIFT, solid: { kind: 'colored', band: 3 } };
const GREY_EMITTER: Emitter = { cell: { col: 20, row: 5 }, dir: 'l', range: 12, speed: 4, period: 60, phase: 0, band: null };

const st = (step: number, over: Partial<SimState> & { band?: number } = {}): SimState =>
  ({
    step,
    status: 'playing',
    player: { x: 1, y: 9, band: over.band ?? 0, graceBand: null },
    twin: null,
    ...over,
  }) as unknown as SimState;

const level = (extra: Partial<Level>): Level => ({ ...gridLevel(['.@..E', '#####']), ...extra });

describe('renderTime', () => {
  it('blends only across two consecutive playing steps', () => {
    expect(renderTime(st(10), st(11), 0.5)).toEqual({ t0: 10, t1: 11, a: 0.5 });
    expect(renderTime(st(200), st(0), 0.5)).toEqual({ t0: 0, t1: 0, a: 0 });
    expect(renderTime(st(10), st(11, { status: 'dead' }), 0.5).a).toBe(0);
  });
});

describe('slab interpolation', () => {
  const plan = (prev: number, now: number, alpha: number, m = LIFT) =>
    planKinetics(level({ movers: [m] }), st(prev), st(now), alpha, OPTS).slabs[0]!;

  it('is exact at whole steps and at half steps (px)', () => {
    expect(plan(60, 61, 0).y).toBe(4 * 16); // still waiting
    expect(plan(69, 70, 1).y).toBe((4 - 10 / 16) * 16); // 10 steps into the rise: 0.625 tile
    expect(plan(70, 71, 0.5).y).toBe((4 - 0.65625) * 16); // 53.5 px
    expect(plan(70, 71, 0.5).x).toBe(5 * 16);
  });

  it('wraps from the end of the cycle to its start without a jump', () => {
    expect(plan(311, 312, 0).y).toBe((4 - 0.0625) * 16);
    expect(plan(311, 312, 0.5).y).toBe((4 - 0.03125) * 16);
    expect(plan(311, 312, 1).y).toBe(4 * 16);
  });

  it('shows a respawn (step back to 0) at once, no slide', () => {
    expect(plan(200, 0, 0.5).y).toBe(4 * 16);
  });

  it('has one frame per tile and a chevron only while moving', () => {
    expect(plan(10, 11, 0).frames).toEqual(['slab/safe/solid/L', 'slab/safe/solid/M', 'slab/safe/solid/R']);
    expect(plan(10, 11, 0).chevron).toBeNull();
    expect(plan(70, 71, 0).chevron).toBe('u');
    expect(plan(250, 251, 0).chevron).toBe('d');
  });

  it('draws a coloured slab as a ghost unless the body band or grace colour matches', () => {
    const lv = level({ movers: [GREEN] });
    const frame = (s: SimState) => planKinetics(lv, s, s, 0, OPTS).slabs[0]!.frames[0];
    expect(frame(st(0, { band: 3 }))).toBe('slab/yellow/solid/L');
    expect(frame(st(0, { band: 1 }))).toBe('slab/yellow/ghost/L');
    expect(slabHolds(GREEN, { band: 1, graceBand: 3 })).toBe(true);
  });
});

describe('trackCells', () => {
  it('draws stops at both ends and v between, on the slab centre column', () => {
    const cells = trackCells(LIFT);
    expect(cells).toHaveLength(7);
    expect(cells.every((c) => c.col === 6)).toBe(true);
    const frames = Object.fromEntries(cells.map((c) => [c.row, c.frames[0]]));
    expect(frames[4]).toBe('track/stop/d');
    expect(frames[-2]).toBe('track/stop/u');
    expect(frames[1]).toBe('track/v');
  });

  it('joins an L-shaped loop with corner cells', () => {
    const l: Mover = {
      ...LIFT,
      width: 1,
      path: [{ kind: 'move', dir: 'r', tiles: 2 }, { kind: 'move', dir: 'd', tiles: 2 }, { kind: 'move', dir: 'l', tiles: 2 }, { kind: 'move', dir: 'u', tiles: 2 }],
    };
    const frames = trackCells(l).map((c) => c.frames[0]);
    expect(frames.filter((f) => ['track/sw', 'track/se', 'track/nw', 'track/ne'].includes(f as string))).toHaveLength(4);
  });
});

describe('sweptCells', () => {
  it('covers the whole width over the whole path', () => {
    const cells = sweptCells(LIFT, 40);
    expect(cells.size).toBe(3 * 7);
    expect(cells.has(4 * 40 + 5)).toBe(true);
    expect(cells.has(-2 * 40 + 7)).toBe(true);
    expect(cells.has(3 * 40 + 8)).toBe(false);
  });
});

describe('shots', () => {
  it('are keyed by fire step and blended with the previous position', () => {
    const shots = planShots(GREY_EMITTER, 0, { t0: 60, t1: 61, a: 0.5 });
    expect(shots.map((s) => s.key)).toEqual(['0:0', '0:60']);
    expect(shots[1]?.x).toBe(20.4375);
    expect(shots[0]?.x).toBe(20.5 - (60.5 * 4) / 32);
    expect(planShots(GREY_EMITTER, 0, { t0: 61, t1: 62, a: 0 })[1]?.key).toBe('0:60');
  });

  it('are in px in the plan and a shot fired this step is not blended from nothing', () => {
    const lv = level({ emitters: [GREY_EMITTER] });
    const p = planKinetics(lv, st(59), st(60), 0.5, OPTS);
    expect(p.shots).toHaveLength(2);
    expect(p.shots[1]).toMatchObject({ key: '0:60', x: 20.5 * 16, y: 5.5 * 16 });
  });

  it('shimmer through a body they cannot hit, never through one they can', () => {
    const body = (band: number) => ({ ...st(76), player: { x: 10.5, y: 6, band, graceBand: null } }) as unknown as SimState;
    const lv = (band: Emitter['band']) => level({ emitters: [{ ...GREY_EMITTER, band }] });
    const count = (band: Emitter['band'], b: number) => planKinetics(lv(band), body(b), body(b), 0, OPTS).shimmers.length;
    expect(count(4, 0)).toBe(1); // red bolt through a standing body: harmless
    expect(count(null, 0)).toBe(0); // a grey bolt hits everyone
    expect(count(4, 4)).toBe(0); // red bolt, red body: a hit, no shimmer
  });
});

describe('emitter tell', () => {
  it('glows for the 18 steps ending on the step the shot leaves', () => {
    const on = Array.from({ length: 60 }, (_, t) => emitterTell(GREY_EMITTER, t, 18).on);
    expect(on.filter(Boolean)).toHaveLength(18);
    expect(on[42]).toBe(false);
    expect(on[43]).toBe(true);
    expect(on[59]).toBe(true);
    expect(on[0]).toBe(true);
    expect(on[1]).toBe(false);
  });

  it('rises toward the shot and uses the tell frame', () => {
    expect(emitterTell(GREY_EMITTER, 43, 18).glow).toBeCloseTo(1 / 18);
    expect(emitterTell(GREY_EMITTER, 0, 18).glow).toBe(1);
    const lv = level({ emitters: [GREY_EMITTER] });
    expect(planKinetics(lv, st(50), st(50), 0, OPTS).emitters[0]?.frame).toBe('emitter/l/grey/tell');
    expect(planKinetics(lv, st(20), st(20), 0, OPTS).emitters[0]?.frame).toBe('emitter/l/grey/idle');
  });

  it('never lets a short period glow all the time', () => {
    const fast = { ...GREY_EMITTER, period: 12 };
    expect(Array.from({ length: 12 }, (_, t) => emitterTell(fast, t, 18).on).filter(Boolean)).toHaveLength(6);
  });
});

describe('no kinetics', () => {
  it('plans nothing', () => {
    expect(planKinetics(level({}), st(5), st(6), 0.5, OPTS)).toEqual({ slabs: [], emitters: [], shots: [], shimmers: [] });
  });
});

describe('kineticsSnapshot', () => {
  it('reports exact tile positions at the step', () => {
    const snap = kineticsSnapshot(level({ movers: [LIFT], emitters: [GREY_EMITTER] }), st(61), 18);
    expect(snap.movers[0]).toEqual({ x: 5, y: 4 - 1 / 16, holds: true });
    expect(snap.shots[1]).toEqual({ emitter: 0, firedAt: 60, x: 20.375, y: 5.5 });
  });
});
