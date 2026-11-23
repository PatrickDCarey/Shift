/**
 * projectiles.md acceptance checks 1-10 ("Room B": long safe floor, an emitter
 * one row above it) through the real `step` and `outcomePhase`.
 */
import { describe, expect, it } from 'vitest';
import type { Band, Emitter, Level, PlayerState, SimEvent, SimState } from '../types';
import { createSim } from './create';
import { arena, floorRow } from './moversKit';
import { outcomePhase } from './status';
import { at, cruiseFrames, firstStep, frame, gridLevel, params, repeat, row, runFromSpawn } from './testkit';

const emitter = (over: Partial<Emitter> = {}): Emitter => ({
  cell: { col: 20, row: 10 },
  dir: 'l',
  range: 12,
  speed: 4,
  period: 300,
  phase: 0,
  band: null,
  ...over,
});

/** Room B with the body spawning at column `col` (x = col + 0.5, feet on row 11). */
const roomB = (emitters: readonly Emitter[], col = 10, extra: readonly { row: number; col: number; chars: string }[] = []): Level => ({
  ...arena(40, 14, [{ row: 10, col, chars: '@' }, floorRow(40, 11), ...extra], []),
  emitters,
});

type Died = Extract<SimEvent, { type: 'died' }>;
const died = (s: SimState): Died | undefined => s.events.find((e): e is Died => e.type === 'died');
const deathStep = (s: readonly SimState[]): number => firstStep(s, (st) => died(st) !== undefined);

describe('check 1: grey, standing', () => {
  const s = runFromSpawn(roomB([emitter()]), repeat(120, ''));
  it('is hit on step 76 with cause hit, not before', () => {
    expect(deathStep(s)).toBe(76);
    expect(died(at(s, 76))).toEqual({ type: 'died', body: 0, cause: 'hit' });
    expect(at(s, 76).status).toBe('dead');
    expect(at(s, 75).status).toBe('playing');
  });
});

describe('check 2: coloured passes through', () => {
  it('band R never hits a standing body', () => {
    const s = runFromSpawn(roomB([emitter({ band: 4 })]), repeat(150, ''));
    expect(s.every((st) => st.status === 'playing')).toBe(true);
  });
});

describe('check 3: white hits only a standing body', () => {
  it('hits the standing body on step 76', () => {
    expect(deathStep(runFromSpawn(roomB([emitter({ band: 0 })]), repeat(120, '')))).toBe(76);
  });
  it('never hits a body walking left at gear 1 through the lane (grey would)', () => {
    const walk = repeat(150, 'L');
    expect(runFromSpawn(roomB([emitter({ band: 0 })], 14), walk).every((st) => st.status === 'playing')).toBe(true);
    expect(deathStep(runFromSpawn(roomB([emitter()], 14), walk))).toBeGreaterThan(0);
  });
});

describe('check 4: range', () => {
  it('a body at x 6.5 is never hit; at x 8.5 the last live box still hits', () => {
    expect(runFromSpawn(roomB([emitter()], 6), repeat(150, '')).every((st) => st.status === 'playing')).toBe(true);
    const near = runFromSpawn(roomB([emitter()], 8), repeat(150, ''));
    expect(deathStep(near)).toBeGreaterThan(0);
    expect(deathStep(near)).toBeLessThanOrEqual(96);
  });
});

describe('check 5: empty start', () => {
  it('with phase 100 the first shot leaves at t 200 (hit on step 276)', () => {
    const s = runFromSpawn(roomB([emitter({ phase: 100 })]), repeat(300, ''));
    expect(deathStep(s)).toBe(276);
  });
});

describe('check 6: jump over a grey shot', () => {
  const run = (n: number): SimState[] => runFromSpawn(roomB([emitter()]), [...repeat(n - 1, ''), frame('J'), ...repeat(120, '')]);
  it('J on any step 41-73 is never hit', () => {
    for (const n of [41, 57, 73]) expect(run(n).every((st) => st.status === 'playing')).toBe(true);
  });
  it('J on step 40 is hit on step 84; J on step 74 is hit on step 76', () => {
    expect(deathStep(run(40))).toBe(84);
    expect(deathStep(run(74))).toBe(76);
  });
});

describe('check 7: band at the start of the step', () => {
  it('a band=Y lane hits a body cruising at gear 3 and only when its start band is 3', () => {
    const lvl: Level = {
      ...arena(40, 14, [{ row: 10, col: 2, chars: '@' }, floorRow(40, 11)], []),
      emitters: [emitter({ cell: { col: 20, row: 0 }, dir: 'd', range: 11, speed: 4, period: 12, band: 3 })],
    };
    const s = runFromSpawn(lvl, cruiseFrames(3, 'R', 200));
    const d = deathStep(s);
    expect(d).toBeGreaterThan(0);
    expect(at(s, d - 1).player.band).toBe(3);
    expect(s.slice(0, d - 1).every((st) => st.status === 'playing')).toBe(true);
    const red = { ...lvl, emitters: [{ ...(lvl.emitters?.[0] as Emitter), band: 4 as Band }] };
    expect(runFromSpawn(red, cruiseFrames(3, 'R', 200)).every((st) => st.status !== 'dead')).toBe(true);
  });
});

/** A player standing at (x, feet y) in a level with `E` at (col 10, row 10). */
const playerAt = (lvl: Level, x: number, y: number, home = false): PlayerState => ({ ...createSim(lvl, params).player, x, y, home });

describe('checks 8 and 9: exit wins, home is never hit', () => {
  const lvl = roomB([emitter()], 4, [{ row: 10, col: 10, chars: 'E' }]);
  const hits = { t1: 76, startBands: [0, 0] as const };
  it('on an exit and in the lane on the same step: won, no died', () => {
    const res = outcomePhase(playerAt(lvl, 10.5, 11), null, [], lvl, params, hits);
    expect(res.outcome).toBe('won');
    expect(res.events.some((e) => e.type === 'died')).toBe(false);
    const off = outcomePhase(playerAt(lvl, 10.5, 11), null, [], { ...lvl, tiles: lvl.tiles.map((t) => (t.kind === 'exit' ? { kind: 'empty' as const } : t)) }, params, hits);
    expect(off.outcome).toBe('dead');
  });
  it('a home twin in the lane is not hit', () => {
    const l2: Level = { ...lvl, twinStart: { col: 10, row: 10 } };
    const twin = playerAt(l2, 10.5, 11, true);
    const res = outcomePhase(playerAt(l2, 3.5, 11), twin, [], l2, params, hits);
    expect(res.outcome).toBeNull();
  });
});

describe('Tandem: either body hit kills the run', () => {
  it('a twin standing in the lane dies on step 76 as body 1', () => {
    const lvl: Level = {
      ...gridLevel([row(40, '.'), row(40, '.', { 3: '@', 10: '&' }), row(40, '#')]),
      emitters: [emitter({ cell: { col: 20, row: 1 } })],
    };
    const s = runFromSpawn(lvl, repeat(100, ''));
    expect(deathStep(s)).toBe(76);
    expect(died(at(s, 76))).toEqual({ type: 'died', body: 1, cause: 'hit' });
  });
});

describe('check 10: respawn rewinds the lane', () => {
  const s = runFromSpawn(roomB([emitter()]), repeat(260, ''));
  it('dies again at the same lane step on every attempt', () => {
    expect(at(s, 76).status).toBe('dead');
    expect(at(s, 101).step).toBe(0);
    expect(at(s, 101).status).toBe('playing');
    const deaths = s.map((st, i) => (died(st) ? i + 1 : 0)).filter(Boolean);
    expect(deaths.slice(0, 2)).toEqual([76, 177]);
  });
  it('is deterministic (check 11)', () => {
    expect(runFromSpawn(roomB([emitter()]), repeat(260, ''))).toEqual(s);
  });
});
