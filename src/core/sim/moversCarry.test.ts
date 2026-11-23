/**
 * moving-objects.md acceptance checks 2-6 and 8-10 (carry, swept landing,
 * top-only, no inheritance, drag ignores carry) through the real `step`.
 */
import { describe, expect, it } from 'vitest';
import { createSim } from './create';
import { arena, floorRow, liftPath, restPath, shuttlePath, slab } from './moversKit';
import { advance, at, eventTypes, firstStep, frame, params, repeat, runFromSpawn } from './testkit';

/** Lift L's top (origin row 10): rises 6 tiles at 0.0625/step (speed 2 = 2/32; the spec text says 0.1171875, which is wrong) between t 60 and 156, back down 216-312. */
const top = (t: number): number => {
  if (t <= 60) return 10;
  if (t <= 156) return 10 - (t - 60) * 0.0625;
  if (t <= 216) return 4;
  if (t <= 312) return 4 + (t - 216) * 0.0625;
  return 10;
};
const liftLevel = (phase = 0) =>
  arena(30, 20, [{ row: 9, col: 10, chars: '@' }, floorRow(30, 19)], [slab(10, 10, 3, liftPath, { phase })]);

describe('check 2: riding a lift standing', () => {
  const s = runFromSpawn(liftLevel(), repeat(312, ''));
  it('feet follow the slab, grounded, band 0, vx 0, no land', () => {
    expect(s.every((st) => st.player.grounded && st.player.band === 0 && st.player.vx === 0)).toBe(true);
    expect(s.some((st) => eventTypes(st).includes('land'))).toBe(false);
    for (const n of [60, 108, 156, 216, 264, 312]) expect(at(s, n).player.y).toBeCloseTo(top(n), 9);
    expect(at(s, 108).player.y).toBe(10 - 48 * 0.0625);
    expect(at(s, 156).player.y).toBe(4);
  });
  it('is deterministic (check 13)', () => {
    expect(runFromSpawn(liftLevel(), repeat(312, ''))).toEqual(s);
  });
});

describe('check 3: walking on a shuttle', () => {
  const lvl = arena(40, 20, [{ row: 9, col: 6, chars: '@' }, floorRow(40, 19)], [slab(5, 10, 8, shuttlePath)]);
  const s = runFromSpawn(lvl, [...repeat(60, ''), ...repeat(60, 'R')]);
  it('x unchanged during the wait', () => {
    expect(s.slice(0, 60).every((st) => st.player.x === 6.5)).toBe(true);
  });
  it('carry 3.75 plus legs 2.975, band 1 every step', () => {
    expect(at(s, 120).player.x - 6.5).toBeCloseTo(6.725, 5);
    expect(s.slice(60).every((st) => st.player.band === 1)).toBe(true);
    expect(s.every((st) => st.player.grounded)).toBe(true);
  });
});

describe('check 4: jump cancels carry', () => {
  const s = runFromSpawn(liftLevel(), [...repeat(99, ''), frame('J'), ...repeat(120, '')]);
  const y99 = at(s, 99).player.y;
  it('step 100 is launch only; apex 3.0 above the step-99 feet on flight step 24', () => {
    const launch = -params.jumpSpeed * params.dt + 0.5 * params.gravity * params.dt * params.dt;
    expect(at(s, 100).player.y - y99).toBeCloseTo(launch, 9);
    expect(at(s, 100).player.grounded).toBe(false);
    expect(at(s, 123).player.y).toBeCloseTo(y99 - 3, 6);
  });
  it('lands back on the slab (pinned step)', () => {
    const n = firstStep(s.slice(100), (st) => st.player.grounded) + 100;
    expect(n).toBe(PINNED_LANDING);
    expect(at(s, n).player.y).toBeCloseTo(top(n), 9);
  });
});
const PINNED_LANDING = 135;

describe('check 5: swept landing on a rising slab', () => {
  const lvl = arena(30, 22, [{ row: 0, col: 10, chars: '@' }, floorRow(30, 21)], [slab(10, 16, 3, liftPath, { phase: 40 })]);
  const s = runFromSpawn(lvl, repeat(120, ''));
  it('lands once on the slab, never passes through', () => {
    expect(s.filter((st) => eventTypes(st).includes('land'))).toHaveLength(1);
    const n = firstStep(s, (st) => st.player.grounded);
    expect(at(s, n).player.vy).toBe(0);
    expect(at(s, n).player.y).toBeLessThan(16);
    expect(at(s, n - 1).player.vy).toBeGreaterThan(10);
    expect(s.slice(n).every((st) => st.player.grounded && st.player.y < 16)).toBe(true);
  });
});

describe('check 6: carry into a wall', () => {
  const lvl = arena(
    40,
    20,
    [{ row: 9, col: 3, chars: '@' }, { row: 8, col: 8, chars: '#' }, { row: 9, col: 8, chars: '#' }, floorRow(40, 19)],
    [slab(2, 10, 8, shuttlePath)],
  );
  const s = runFromSpawn(lvl, repeat(260, ''));
  it('stops at contact, no wallStop, vx 0, then falls with coyote, never dies', () => {
    expect(at(s, 140).player.x).toBeCloseTo(8 - params.playerWidth / 2, 9);
    expect(s.some((st) => eventTypes(st).includes('wallStop'))).toBe(false);
    expect(s.every((st) => st.player.vx === 0 && st.status === 'playing')).toBe(true);
    const fall = firstStep(s, (st) => !st.player.grounded);
    expect(fall).toBeGreaterThan(140);
    expect(at(s, fall).player.coyoteSteps).toBeGreaterThan(0);
    expect(at(s, fall - 1).player.y).toBe(10);
  });
});

describe('check 8: top-only', () => {
  it('a standing jump from under a slab passes up through it and lands on top', () => {
    const lvl = arena(30, 20, [{ row: 9, col: 10, chars: '@' }, floorRow(30, 10)], [slab(9, 8, 4, restPath)]);
    const s = runFromSpawn(lvl, [frame('J'), ...repeat(120, '')]);
    expect(s.some((st) => eventTypes(st).includes('ceiling'))).toBe(false);
    expect(Math.min(...s.map((st) => st.player.y))).toBeCloseTo(7, 6);
    expect(s[s.length - 1]?.player.y).toBe(8);
  });
  it('walking into a slab side never stops the body', () => {
    const lvl = arena(30, 20, [{ row: 9, col: 2, chars: '@' }, floorRow(30, 10)], [slab(8, 9, 3, restPath)]);
    const s = runFromSpawn(lvl, repeat(200, 'R'));
    expect(s.some((st) => eventTypes(st).includes('wallStop'))).toBe(false);
    expect(s[199]?.player.x).toBeGreaterThan(12);
  });
  it('a slab sliding into a body never moves it', () => {
    const path = [
      { kind: 'wait', steps: 10 },
      { kind: 'move', dir: 'r', tiles: 6 },
      { kind: 'move', dir: 'l', tiles: 6 },
    ] as const;
    const lvl = arena(30, 20, [{ row: 9, col: 10, chars: '@' }, floorRow(30, 10)], [slab(4, 9, 3, path)]);
    const s = runFromSpawn(lvl, repeat(250, ''));
    expect(s.every((st) => st.player.x === 10.5 && st.player.y === 10 && st.player.vx === 0)).toBe(true);
  });
});

describe('checks 9 and 10: no inheritance, drag ignores carry', () => {
  const lvl = arena(60, 20, [{ row: 9, col: 6, chars: '@' }, floorRow(60, 19)], [slab(5, 10, 16, shuttlePath)]);
  it('a standing jump from a moving shuttle: vx 0 and x unchanged through the flight', () => {
    const s = runFromSpawn(lvl, [...repeat(79, ''), frame('J'), ...repeat(40, '')]);
    const x0 = at(s, 79).player.x;
    expect(x0).toBeGreaterThan(6.5);
    expect(s.slice(79, 119).every((st) => st.player.vx === 0 && st.player.x === x0)).toBe(true);
  });
  it('a gear-2 flat jump: drag counter is the leg distance, no drop', () => {
    const s = runFromSpawn(lvl, [frame('R+'), ...repeat(69, 'R'), frame('RJ'), ...repeat(60, 'R')]);
    const air = s.slice(70).filter((st) => !st.player.grounded);
    const maxDrag = Math.max(...air.map((st) => st.player.airDistance));
    expect(maxDrag).toBeGreaterThan(4.5);
    expect(maxDrag).toBeLessThan(4.9);
    expect(s.some((st) => eventTypes(st).includes('airDrag'))).toBe(false);
    expect(s[s.length - 1]?.player.grounded).toBe(true);
  });
});

describe('no regression guard', () => {
  it('movers: [] is bit-identical to no movers', () => {
    const base = arena(30, 12, [{ row: 9, col: 2, chars: '@' }, floorRow(30, 10)], []);
    const { movers: _movers, ...plain } = base;
    const frames = [...repeat(40, 'R'), frame('J'), ...repeat(60, 'R')];
    expect(runFromSpawn(base, frames)).toEqual(runFromSpawn(plain, frames));
    expect(createSim(base, params)).toEqual(createSim(plain, params));
    expect(advance(base, createSim(base, params), frames)).toEqual(advance(plain, createSim(plain, params), frames));
  });
});
