/** sweep.md acceptance checks 1-6 (the chasing front) through the real `step` and `outcomePhase`. */
import { describe, expect, it } from 'vitest';
import { sweepFront } from '../motion';
import type { Level, SimEvent, SimState, Sweep } from '../types';
import { createSim } from './create';
import { arena, floorRow } from './moversKit';
import { outcomePhase } from './status';
import { at, cruiseFrames, firstStep, gridLevel, params, repeat, row, runFromSpawn } from './testkit';

const SWEEP: Sweep = { x0: 0, speed: 2, delay: 90 };
type Died = Extract<SimEvent, { type: 'died' }>;
const died = (s: SimState): Died | undefined => s.events.find((e): e is Died => e.type === 'died');
const deathStep = (s: readonly SimState[]): number => firstStep(s, (st) => died(st) !== undefined);

/** Safe floor on row 11, the body spawning at `col`. */
const floorLevel = (col: number, sweep: Sweep = SWEEP, width = 300): Level => ({
  ...arena(width, 14, [{ row: 10, col, chars: '@' }, floorRow(width, 11)], []),
  sweep,
});

describe('check 1: the front formula', () => {
  it('0 for t 0-90, 0.0625 at t 91, 6.25 at t 190', () => {
    expect(sweepFront(SWEEP, 0, 300)).toBe(0);
    expect(sweepFront(SWEEP, 90, 300)).toBe(0);
    expect(sweepFront(SWEEP, 91, 300)).toBe(0.0625);
    expect(sweepFront(SWEEP, 190, 300)).toBe(6.25);
  });
});

describe('check 2: a standing body', () => {
  const s = runFromSpawn(floorLevel(8), repeat(300, ''));
  it('is caught on step 226 (front 8.5), not on 225 (8.4375)', () => {
    expect(deathStep(s)).toBe(226);
    expect(died(at(s, 226))).toEqual({ type: 'died', body: 0, cause: 'sweep' });
    expect(at(s, 225).status).toBe('playing');
    expect(at(s, 226).status).toBe('dead');
    expect(sweepFront(SWEEP, 225, 300)).toBe(8.4375);
  });
  it('air does not save you', () => {
    const jumping = runFromSpawn(floorLevel(8), [...repeat(200, ''), ...repeat(1, 'J'), ...repeat(60, '')]);
    expect(deathStep(jumping)).toBeLessThanOrEqual(226);
  });
});

describe('check 3: blue loses, green escapes', () => {
  it('gear 1 held from step 1 is caught eventually', () => {
    const s = runFromSpawn(floorLevel(2), repeat(1500, 'R'));
    expect(deathStep(s)).toBeGreaterThan(300);
    expect(died(s[deathStep(s) - 1] as SimState)?.cause).toBe('sweep');
  });
  it('gear 2 on a long floor is never caught', () => {
    const s = runFromSpawn(floorLevel(2), cruiseFrames(2, 'R', 1500));
    expect(s.every((st) => st.status === 'playing')).toBe(true);
  });
});

describe('check 4: exit wins on a same-step catch', () => {
  const lvl: Level = { ...floorLevel(2), tiles: floorLevel(2).tiles.map((t, i) => (i === 10 * 300 + 8 ? { kind: 'exit' as const } : t)) };
  const body = { ...createSim(lvl, params).player, x: 8.5, y: 11 };
  const hits = { t1: 226, startBands: [0, 0] as const };
  it('won, no died', () => {
    const res = outcomePhase(body, null, [], lvl, params, hits);
    expect(res.outcome).toBe('won');
    expect(res.events.some((e) => e.type === 'died')).toBe(false);
  });
  it('the same body off the exit is caught', () => {
    const { sweep: _s, ...rest } = lvl;
    const off = outcomePhase({ ...body, x: 7.5 }, null, [], { ...rest, sweep: SWEEP }, params, { t1: 226, startBands: [0, 0] });
    expect(off.outcome).toBe('dead');
  });
});

describe('check 5: respawn rewinds the front', () => {
  it('is caught on the same lane step every life', () => {
    const s = runFromSpawn(floorLevel(8), repeat(520, ''));
    expect(at(s, 251).step).toBe(0);
    const deaths = s.map((st, i) => (died(st) ? i + 1 : 0)).filter(Boolean);
    expect(deaths.slice(0, 2)).toEqual([226, 477]);
  });
});

describe('Tandem: either body caught kills the run', () => {
  it('a twin standing at x 8.5 is caught on step 226 as body 1', () => {
    const lvl: Level = {
      ...gridLevel([row(300, '.'), row(300, '.', { 20: '@', 8: '&' }), row(300, '#')]),
      sweep: SWEEP,
    };
    const s = runFromSpawn(lvl, repeat(260, ''));
    expect(deathStep(s)).toBe(226);
    expect(died(at(s, 226))).toEqual({ type: 'died', body: 1, cause: 'sweep' });
  });
});

describe('check 6: determinism and the old path', () => {
  it('runs twice to the same states; no sweep, no change', () => {
    const lvl = floorLevel(8);
    expect(runFromSpawn(lvl, repeat(300, 'R'))).toEqual(runFromSpawn(lvl, repeat(300, 'R')));
    const { sweep: _s, ...plain } = lvl;
    expect(runFromSpawn(plain, repeat(300, '')).every((st) => st.status === 'playing')).toBe(true);
  });
});
