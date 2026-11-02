import { describe, expect, it } from 'vitest';
import tuningJson from '../../data/tuning.json';
import { SIM_EPSILON, type SimParams } from '../types';
import { airDrag } from './drag';
import { paramsFromJson } from './testkit';

const params = paramsFromJson(tuningJson);
const per = params.airDragTilesPerGear;

describe('airDrag: one band per airDragTilesPerGear tiles (GDD §4.9)', () => {
  it('does nothing below the threshold', () => {
    expect(airDrag(12, 5.9, params)).toEqual({ vx: 12, airDistance: 5.9, dropped: false });
  });

  it.each([
    [12, 9],
    [10.5, 9],
    [9, 6],
    [7.5, 6],
    [6, 3],
    [4.5, 3],
  ])('drops |vx| %f to exactly %i at the threshold, keeping the sign', (from, to) => {
    expect(airDrag(from, per, params)).toEqual({ vx: to, airDistance: 0, dropped: true });
    expect(airDrag(-from, per + 0.1, params).vx).toBe(-to);
  });

  it('subtracts one threshold from the counter and keeps the remainder', () => {
    const r = airDrag(12, 6.15, params);
    expect(r.airDistance).toBeCloseTo(0.15, 12);
  });

  it('drops at most one band per step even with two thresholds banked', () => {
    const r = airDrag(12, 2 * per + 1, params);
    expect(r.vx).toBe(9);
    expect(r.airDistance).toBe(per + 1);
  });

  it('treats a counter within SIM_EPSILON of the threshold as reached (5.999999999999995)', () => {
    let d = 0;
    for (let i = 0; i < 60; i += 1) d += 6 * params.dt;
    expect(d).toBeLessThan(6);
    expect(airDrag(6, d, params).dropped).toBe(true);
    expect(airDrag(6, per - SIM_EPSILON * 10, params).dropped).toBe(false);
  });
});

describe('airDrag: floor at airDragMinBand', () => {
  it('never drops blue (gear 1) or white, and leaves the counter alone', () => {
    expect(airDrag(3, 40, params)).toEqual({ vx: 3, airDistance: 40, dropped: false });
    expect(airDrag(-3, 6, params)).toEqual({ vx: -3, airDistance: 6, dropped: false });
    expect(airDrag(0, 6, params)).toEqual({ vx: 0, airDistance: 6, dropped: false });
  });

  it('honours a higher floor from tuning', () => {
    const floor2: SimParams = { ...params, airDragMinBand: 2 };
    expect(airDrag(6, 7, floor2).dropped).toBe(false);
    expect(airDrag(9, 7, floor2).vx).toBe(6);
  });

  it('can drop to white when the floor is 0', () => {
    const floor0: SimParams = { ...params, airDragMinBand: 0 };
    expect(airDrag(3, 6, floor0)).toEqual({ vx: 0, airDistance: 0, dropped: true });
    expect(Object.is(airDrag(-3, 6, floor0).vx, 0)).toBe(true);
  });
});
