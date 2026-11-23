/**
 * moving-objects.md acceptance checks 7, 11, 12 and 13: coloured slab = coloured
 * floor, respawn rewinds, death and win freeze, Tandem.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, type InputFrame, type Level, type SimState } from '../types';
import { createSim } from './create';
import { arena, floorRow, liftPath, restPath, shuttlePath, slab } from './moversKit';
import { advance, at, cruiseFrames, eventTypes, frame, gridLevel, params, repeat, row, runFromSpawn } from './testkit';

const GREEN = { kind: 'colored', band: 2 } as const;
const RESTART: InputFrame = { ...EMPTY_INPUT, restart: true };

describe('check 7: a G slab in a wait behaves like G tiles', () => {
  const tiles: Level = gridLevel(Array.from({ length: 14 }, (_, r) => {
    if (r === 9) return row(60, '.', { 2: '@' });
    if (r === 10) return '#'.repeat(12) + 'G'.repeat(48);
    return row(60, '.');
  }));
  const slabbed = arena(60, 14, [{ row: 9, col: 2, chars: '@' }, { row: 10, col: 0, chars: '#'.repeat(12) }], [
    slab(12, 10, 48, restPath, { solid: GREEN }),
  ]);
  const same = (frames: readonly InputFrame[]): SimState[] => {
    const a = runFromSpawn(tiles, frames);
    const b = runFromSpawn(slabbed, frames);
    expect(b.map((s) => s.player)).toEqual(a.map((s) => s.player));
    expect(b.map((s) => s.status)).toEqual(a.map((s) => s.status));
    expect(b.map(eventTypes)).toEqual(a.map(eventTypes));
    return b;
  };
  const last = (s: SimState[]): SimState => at(s, s.length);

  it('walking on at gear 2 is supported', () => {
    const s = same(cruiseFrames(2, 'R', 150));
    expect(last(s).player.grounded).toBe(true);
    expect(last(s).player.x).toBeGreaterThan(14);
  });
  it('gear 1 walks into a hole and falls with coyote', () => {
    const s = same(repeat(280, 'R'));
    expect(s.some((st) => eventTypes(st).includes('fallThrough'))).toBe(true);
    expect(s.some((st) => st.status === 'dead')).toBe(true);
  });
  it('letting go from gear 2 holds 6 steps of grace, then falls', () => {
    const s = same([...cruiseFrames(2, 'R', 120), ...repeat(40, '')]);
    const slow = s.findIndex((st, i) => i >= 124 && st.player.graceSteps > 0);
    expect(slow).toBeGreaterThan(0);
    expect(s.slice(slow, slow + 6).every((st) => st.player.grounded)).toBe(true);
    expect(s.some((st) => st.player.graceSteps > 0)).toBe(true);
    const fall = s.find((st, i) => i > slow && !st.player.grounded);
    expect(fall).toBeDefined();
  });
  it('band 2 lands, band 3 falls through', () => {
    const two = same([...cruiseFrames(2, 'R', 70), frame('RJ'), ...repeat(80, 'R')]);
    expect(two.some((st) => eventTypes(st).includes('land'))).toBe(true);
    const three = same(cruiseFrames(3, 'R', 120));
    expect(three.some((st) => st.status === 'dead')).toBe(true);
  });
});

describe('a moving G slab carries a gear-2 body without changing band or vx', () => {
  it('walking on from a ledge at gear 2 stays band 2, vx 6, grounded while the slab moves', () => {
    const path = [{ kind: 'wait', steps: 100 }, { kind: 'move', dir: 'r', tiles: 12 }, { kind: 'move', dir: 'l', tiles: 12 }] as const;
    const lvl = arena(60, 14, [{ row: 9, col: 2, chars: '@' }, { row: 10, col: 0, chars: '#'.repeat(10) }], [slab(10, 10, 16, path, { solid: GREEN })]);
    const s = runFromSpawn(lvl, [...cruiseFrames(2, 'R', 160)]);
    const on = s.slice(110, 150);
    expect(on.every((st) => st.player.band === 2 && st.player.grounded && st.player.vx === params.gearSpeeds[2])).toBe(true);
    expect(on.every((st) => st.step > 100)).toBe(true);
  });
});

describe('check 11: respawn rewinds, death and win freeze', () => {
  const lvl = arena(30, 20, [{ row: 9, col: 10, chars: '@' }, floorRow(30, 19)], [slab(10, 10, 3, liftPath)]);
  it('a restart on step 200 rewinds the slab on the respawn step', () => {
    const s = runFromSpawn(lvl, [...repeat(199, ''), RESTART, ...repeat(3, '')]);
    expect(at(s, 199).step).toBe(199);
    expect(at(s, 200).status).toBe('restarting');
    expect(at(s, 200).step).toBe(199);
    expect(at(s, 201).step).toBe(0);
    expect(at(s, 201).player.y).toBe(10);
    expect(at(s, 201).player.grounded).toBe(true);
    expect(at(s, 202).player.y).toBe(10);
  });
  it('death freezes the clock; the respawn is back at t 0', () => {
    const l = arena(30, 14, [{ row: 9, col: 10, chars: '@' }], [slab(10, 10, 3, restPath)]);
    const s = runFromSpawn(l, [...repeat(30, ''), ...repeat(80, 'R'), ...repeat(90, '')]);
    const d = s.findIndex((st) => st.status === 'dead');
    expect(d).toBeGreaterThan(0);
    const frozen = s.slice(d, d + 5);
    expect(frozen.every((st) => st.step === at(s, d + 1).step)).toBe(true);
    expect(s.some((st) => st.step === 0 && st.player.y === 10 && st.player.grounded && st.status === 'playing')).toBe(true);
  });
  it('winning freezes the clock', () => {
    const l = arena(30, 20, [{ row: 9, col: 10, chars: '@' }, { row: 9, col: 16, chars: 'E' }, floorRow(30, 10)], [slab(10, 11, 3, liftPath)]);
    const s = runFromSpawn(l, repeat(200, 'R'));
    const w = s.findIndex((st) => st.status === 'won');
    expect(w).toBeGreaterThan(0);
    expect(s.slice(w).every((st) => st.step === at(s, w + 1).step)).toBe(true);
  });
});

describe('check 12: Tandem', () => {
  it('both bodies on one slab are both carried', () => {
    const l = arena(30, 20, [{ row: 9, col: 10, chars: '@' }, { row: 9, col: 12, chars: '&' }, floorRow(30, 19)], [slab(10, 10, 4, liftPath)]);
    expect(l.twinStart).not.toBeNull();
    const s = runFromSpawn(l, repeat(130, ''));
    for (const n of [60, 108, 130]) {
      const st = at(s, n);
      expect(st.player.y).toBe(st.twin?.y);
      expect(st.player.grounded && st.twin?.grounded).toBe(true);
    }
    expect(at(s, 108).player.y).toBe(10 - 48 * 0.0625);
  });
  it('two bodies on two slabs follow their own slab', () => {
    const l = arena(
      30,
      20,
      [{ row: 9, col: 4, chars: '@' }, { row: 9, col: 20, chars: '&' }, floorRow(30, 19)],
      [slab(4, 10, 3, liftPath), slab(20, 13, 3, liftPath, { phase: 108 })],
    );
    const s = runFromSpawn(l, repeat(60, ''));
    expect(at(s, 1).twin?.y).toBe(10 - 0.0625);
    expect(at(s, 48).twin?.y).toBe(7);
    expect(at(s, 48).player.y).toBe(10);
    expect(s.every((st) => st.player.grounded && st.twin?.grounded === true)).toBe(true);
  });
  it('a home body is never moved by a slab', () => {
    const l = arena(30, 20, [{ row: 9, col: 10, chars: '@' }, { row: 9, col: 12, chars: '&' }, floorRow(30, 19)], [slab(10, 10, 4, liftPath)]);
    const start = createSim(l, params);
    const homeTwin = { ...start, twin: start.twin && { ...start.twin, home: true } };
    const s = advance(l, homeTwin, repeat(108, ''));
    expect(s.twin?.y).toBe(10);
    expect(s.player.y).toBe(10 - 48 * 0.0625);
  });
});

describe('check 13: determinism over a composite run', () => {
  it('runs twice to the same states', () => {
    const lvl = arena(60, 20, [{ row: 9, col: 6, chars: '@' }, floorRow(60, 19)], [slab(5, 10, 16, shuttlePath)]);
    const frames = [frame('R+'), ...repeat(69, 'R'), frame('RJ'), ...repeat(60, 'R'), RESTART, ...repeat(5, '')];
    expect(runFromSpawn(lvl, frames)).toEqual(runFromSpawn(lvl, frames));
  });
});
