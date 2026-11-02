import { describe, expect, it } from 'vitest';
import tuningJson from '../../data/tuning.json';
import { SIM_EPSILON, type SimParams } from '../types';
import { groundSpeed } from './ground';
import { paramsFromJson } from './testkit';

const params = paramsFromJson(tuningJson);
const dt = params.dt;
const [, a1, a2, a3] = params.accel;
const [, b1, b2, b3] = params.brake;
const g = (vx: number, target: number, p: SimParams = params): number => groundSpeed(vx, target, p);

describe('groundSpeed: walking range is instant (GDD §4.4)', () => {
  it('stays exactly 0 (not -0) when standing with nothing held', () => {
    expect(Object.is(g(0, 0), 0)).toBe(true);
  });

  it.each([3, 6, 9, 12])('starts at exactly walking pace from standing toward target %i', (t) => {
    expect(g(0, t)).toBe(3);
    expect(g(0, -t)).toBe(-3);
  });

  it('stops instantly from walking pace and from below it', () => {
    expect(g(3, 0)).toBe(0);
    expect(g(-3, 0)).toBe(0);
    expect(Object.is(g(-2.5, 0), 0)).toBe(true);
  });

  it('turns instantly at or below walking pace to min(|T|, 3) the other way', () => {
    expect(g(3, -3)).toBe(-3);
    expect(g(3, -12)).toBe(-3);
    expect(g(-3, 12)).toBe(3);
    expect(g(1.2, -6)).toBe(-3);
  });

  it('rises instantly to walking pace from below it while holding', () => {
    expect(g(2.2, 12)).toBe(3);
    expect(g(-0.5, -3)).toBe(-3);
  });

  it('holds walking pace exactly in gear 1', () => {
    expect(g(3, 3)).toBe(3);
  });
});

describe('groundSpeed: acceleration per segment (constant rate, chosen at step start)', () => {
  it.each([
    [3, 3 + a1 * dt],
    [5.9, 5.9 + a1 * dt],
    [6, 6 + a2 * dt],
    [8.95, 8.95 + a2 * dt],
    [9, 9 + a3 * dt],
  ])('from %f toward 12', (vx, expected) => {
    expect(g(vx, 12)).toBeCloseTo(expected, 12);
    expect(g(-vx, -12)).toBeCloseTo(-expected, 12);
  });

  it('does not split a step that crosses a gear speed', () => {
    expect(g(5.9, 12)).toBeCloseTo(6.08, 12);
  });

  it('clamps exactly at the target, never overshooting', () => {
    expect(g(8.9, 9)).toBe(9);
    expect(g(11.7, 12)).toBe(12);
    expect(g(5.95, 6)).toBe(6);
    expect(g(-11.9, -12)).toBe(-12);
  });

  it('cruises exactly at the target', () => {
    for (const t of [6, 9, 12]) expect(g(t, t)).toBe(t);
  });

  it('treats a speed within SIM_EPSILON of a gear speed as that gear speed', () => {
    expect(g(9 - SIM_EPSILON / 4, 12)).toBeCloseTo(9 + a3 * dt, 9);
  });
});

describe('groundSpeed: braking (let go, downshift, skid share one rule)', () => {
  it.each([
    [12, 12 - b3 * dt],
    [9.2, 9.2 - b3 * dt],
    [9, 9 - b2 * dt],
    [6, 6 - b1 * dt],
    [3.1, 3.1 - b1 * dt],
  ])('let go from %f', (vx, expected) => {
    expect(g(vx, 0)).toBeCloseTo(expected, 12);
    expect(g(-vx, 0)).toBeCloseTo(-expected, 12);
  });

  it('lets go into the walking range in the same direction, then stops on the next step', () => {
    const landed = g(3.1, 0);
    expect(landed).toBeGreaterThan(0);
    expect(landed).toBeLessThan(3);
    expect(g(landed, 0)).toBe(0);
  });

  it('brakes a downshift at the same rate as letting go, and clamps at the new cruise speed', () => {
    expect(g(12, 9)).toBe(g(12, 0));
    expect(g(9.2, 9)).toBe(9);
    expect(g(-6.1, -3)).toBe(-6.1 + b2 * dt);
    expect(g(-6, -3)).toBe(-6 + b1 * dt);
    expect(g(3.05, 3)).toBe(3);
  });

  it('treats a speed within SIM_EPSILON above a gear speed as that gear speed', () => {
    expect(g(9 + SIM_EPSILON / 4, 0)).toBeCloseTo(9 - b2 * dt, 9);
    expect(g(3 + SIM_EPSILON / 4, 0)).toBe(0);
  });
});

describe('groundSpeed: skid on reversal (GDD §4.5)', () => {
  it('brakes in the original direction at the let-go rate', () => {
    expect(g(12, -12)).toBe(g(12, 0));
    expect(g(-7, 3)).toBe(g(-7, 0));
  });

  it('keeps the sign while skidding into the walking range, then turns instantly', () => {
    const landed = g(3.1, -12);
    expect(landed).toBeGreaterThan(0);
    expect(g(landed, -12)).toBe(-3);
  });

  it('accelerates again when the original direction is held mid-skid', () => {
    expect(g(7, 12)).toBeCloseTo(7 + a2 * dt, 12);
  });

  it('is mirror-symmetric for every start speed and target', () => {
    const speeds = [0, 1, 3, 3.1, 4.5, 6, 7.3, 9, 10.5, 12];
    const targets = [0, 3, 6, 9, 12, -3, -6, -9, -12];
    for (const v of speeds) for (const t of targets) expect(g(-v, -t)).toBe(-g(v, t) + 0);
  });
});

describe('groundSpeed: instantMaxGear is honoured', () => {
  const wide: SimParams = { ...params, instantMaxGear: 2 };

  it('makes 0..6 instant when instantMaxGear is 2', () => {
    expect(g(0, 12, wide)).toBe(6);
    expect(g(6, 0, wide)).toBe(0);
    expect(g(6, -9, wide)).toBe(-6);
    expect(g(5, 3, wide)).toBe(3);
  });

  it('still accelerates above the wider walking range', () => {
    expect(g(6, 12, wide)).toBeCloseTo(6 + a2 * dt, 12);
  });
});
