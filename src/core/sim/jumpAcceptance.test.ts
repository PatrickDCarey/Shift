/**
 * docs/design/features/jump.md acceptance checks 1-12 through the real `step`.
 * "Flight step" k = the k-th state from the launch step (launch = 1).
 */
import { describe, expect, it } from 'vitest';
import type { Gear, SimState } from '../types';
import { createSim } from './create';
import {
  at,
  block,
  cruise,
  eventTypes,
  firstStep,
  frame,
  gridLevel,
  params,
  repeat,
  room,
  row,
  runFrames,
  runFromSpawn,
} from './testkit';

const level = room(240, 2);
const landStep = (states: readonly SimState[]): number => firstStep(states, (s) => eventTypes(s).includes('land'));
const jumped = (s: SimState): boolean => eventTypes(s).includes('jump');
/** Takeoff at `start` with J (+ held dir), then `steps` more with dir held. */
const flight = (lvl = level, start: SimState, dir = '', steps = 80): SimState[] =>
  runFrames(lvl, start, [frame(`${dir}J`), ...repeat(steps, dir)]);

describe('jump check 1: arc from standing', () => {
  const start = createSim(level, params);
  const s = flight(level, start);
  const height = (n: number): number => start.player.y - at(s, n).player.y;

  it('feet 3.00 on flight step 24, never higher; lands on flight step 48; x unchanged', () => {
    expect(height(24)).toBeCloseTo(3, 9);
    expect(Math.max(...s.map((t) => start.player.y - t.player.y))).toBeLessThanOrEqual(3 + 1e-9);
    expect(landStep(s)).toBe(48);
    expect(at(s, 48).player.y).toBe(start.player.y);
    expect(s.every((t) => t.player.x === start.player.x)).toBe(true);
  });
});

describe('jump check 2: same height at every gear', () => {
  it.each([1, 2, 3, 4] as Gear[])('gear %i: max height 3.00, air time 48', (gear) => {
    const start = cruise(level, gear);
    const s = flight(level, start, 'R');
    const air = s.slice(0, landStep(s));
    expect(Math.max(...air.map((t) => start.player.y - t.player.y))).toBeCloseTo(3, 9);
    expect(landStep(s)).toBe(48);
  });
});

describe('jump check 3: no variable height', () => {
  it('J held 1 step vs 40 steps: identical player state and events every step', () => {
    const short = runFromSpawn(level, [frame('J'), ...repeat(59, '')]);
    const long = runFromSpawn(level, [...repeat(40, 'J'), ...repeat(20, '')]);
    short.forEach((t, i) => {
      expect(long[i]!.player).toEqual(t.player);
      expect(long[i]!.events).toEqual(t.events);
    });
  });
});

describe('jump check 5: walking takeoff', () => {
  it('J and R on the same step from standing: vx = 3 at launch; lands 2.375 tiles out', () => {
    const start = createSim(level, params);
    const s = flight(level, start, 'R');
    expect(at(s, 1).player.vx).toBe(3);
    expect(jumped(at(s, 1))).toBe(true);
    // The launch step moves (0 + 3) / 2 * dt (phase 7 trapezoid from standing),
    // 0.025 short of 48 * 3 * dt = 2.4, so the spec value is exactly 2.375.
    const out = at(s, landStep(s)).player.x - start.player.x;
    expect(out).toBeCloseTo(2.375, 9);
  });
});

describe('jump check 6-7: coyote', () => {
  const ledge = room(240, 2, block([10, 11], 0, '#'.repeat(10)), '.');
  const walkOff = (): { states: SimState[]; k: number } => {
    const states = runFrames(ledge, cruise(ledge, 1, 'R', 10), repeat(200, 'R'));
    return { states, k: firstStep(states, (s) => !s.player.grounded) };
  };

  it('J on the 5th airborne step launches (a coyote jump)', () => {
    const { states, k } = walkOff();
    const before = k > 1 ? at(states, k - 1) : states[0]!;
    const s = runFrames(ledge, before, [...repeat(4, 'R'), frame('RJ')]);
    expect(at(s, 1).player.grounded).toBe(false);
    expect(at(s, 5).events).toContainEqual({ type: 'jump', body: 0, coyote: true, buffered: false });
  });

  it('J on the 8th airborne step (and not before): no jump', () => {
    const { states, k } = walkOff();
    const s = runFrames(ledge, at(states, k - 1), [...repeat(7, 'R'), frame('RJ'), ...repeat(30, 'R')]);
    expect(s.some(jumped)).toBe(false);
  });
});

describe('jump check 8-9: jump buffer', () => {
  const start = createSim(level, params);
  const withPress = (flightStep: number): SimState[] =>
    runFrames(level, start, [frame('J'), ...repeat(flightStep - 2, ''), frame('J'), ...repeat(60, '')]);

  it('J on flight step 44 (landing 48): a new jump launches within 1 step after landing', () => {
    const s = withPress(44);
    expect(landStep(s)).toBe(48);
    expect(at(s, 49).events).toContainEqual({ type: 'jump', body: 0, coyote: false, buffered: true });
  });

  it('J on flight step 38 only: no second jump', () => {
    const s = withPress(38);
    expect(s.slice(1).some(jumped)).toBe(false);
  });
});

describe('jump check 10: ceiling', () => {
  it('gear 2 under a safe ceiling: vy >= 0 on contact, |vx| = 6, gear 2; falls back to the floor', () => {
    const roofed = room(240, 2, [{ row: 5, col: 0, chars: '#'.repeat(240) }]);
    const s = flight(roofed, cruise(roofed, 2), 'R');
    const contact = firstStep(s, (t) => eventTypes(t).includes('ceiling'));
    expect(contact).toBeGreaterThan(0);
    expect(at(s, contact).player.vy).toBeGreaterThanOrEqual(0);
    expect(at(s, contact).player).toMatchObject({ gear: 2 });
    expect(Math.abs(at(s, contact).player.vx)).toBe(6);
    expect(landStep(s)).toBeGreaterThan(contact);
    expect(at(s, landStep(s)).player.y).toBe(10);
  });
});

describe('jump check 11: 2-tile ledge', () => {
  it('gear 1, jump with the front edge 1.0 tile from the face: lands on top, gear 1', () => {
    const face = 20;
    const stepped = room(240, 2, block([8, 9], face, '#'.repeat(40)));
    const approach = runFrames(stepped, createSim(stepped, params), repeat(400, 'R'));
    const n = firstStep(approach, (t) => t.player.x + params.playerWidth / 2 >= face - 1 - 1e-9);
    const s = flight(stepped, at(approach, n), 'R');
    const landed = at(s, landStep(s)).player;
    expect(landed).toMatchObject({ y: 8, gear: 1 });
    expect(face - 1 - (at(approach, n).player.x + params.playerWidth / 2)).toBeLessThanOrEqual(0.05);
  });
});

describe('jump check 12: fall cap', () => {
  it('walk off into a 20-tile drop: downward vy never exceeds 20 (and reaches it)', () => {
    const rows = Array.from({ length: 32 }, (_, r) => {
      if (r === 0) return row(40, '.', { 39: 'E' });
      if (r === 9) return row(40, '.', { 2: '@' });
      if (r === 10) return row(40, '.', { 0: '#'.repeat(8) });
      return row(40, r === 30 || r === 31 ? '#' : '.');
    });
    const tall = gridLevel(rows);
    const s = runFromSpawn(tall, repeat(200, 'R'));
    expect(Math.max(...s.map((t) => t.player.vy))).toBe(20);
    expect(s.some((t) => t.player.grounded && t.player.y === 30)).toBe(true);
  });
});
