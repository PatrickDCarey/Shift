/**
 * Multi-step acceptance numbers from docs/design/features/movement-and-gears.md,
 * air-drag.md and GDD §5, reproduced by iterating the motion functions with
 * the test-only kit (flat floor, no walls, flight length given by the spec).
 * Step numbers are asserted exactly and distances to the precision the
 * GDD v1.2 tables print them.
 */
import { describe, expect, it } from 'vitest';
import tuningJson from '../../data/tuning.json';
import type { Gear } from '../types';
import { firstWhere, paramsFromJson, runFlight, runGround, type Sample } from './testkit';

const params = paramsFromJson(tuningJson);
const speedOf = (gear: Gear): number => params.gearSpeeds[gear];
const hold = (target: number) => (): number => target;
/** Gear after pressing + on run steps 1, 3, 5 from gear 1. */
const rampGear = (step: number): Gear => (step >= 5 ? 4 : step >= 3 ? 3 : 2);
const bandStep = (trace: readonly Sample[], band: number): Sample => firstWhere(trace, (s) => s.band === band);
const vxStep = (trace: readonly Sample[], vx: number): Sample => firstWhere(trace, (s) => s.vx === vx);
/** Steps where the band differs from the previous step, collapsed into a sequence. */
const bandSequence = (start: number, trace: readonly Sample[]): number[] =>
  trace.reduce<number[]>((seq, s) => (s.band === seq[seq.length - 1] ? seq : [...seq, s.band]), [start]);

describe('movement-and-gears check 1-2, 13 and GDD §5.1: runway from standing', () => {
  const trace = runGround(params, 0, 120, (step) => speedOf(rampGear(step)));

  it('is exactly 3 (band 1) at the end of step 1', () => {
    expect(trace[0]).toMatchObject({ vx: 3, band: 1 });
    expect(trace[0]?.x).toBeCloseTo(0.03, 2);
  });

  it('reaches green on step 10 (0.60), yellow on step 23 (1.88), red on step 32 (3.23)', () => {
    expect(bandStep(trace, 2)).toMatchObject({ step: 10 });
    expect(bandStep(trace, 2).x).toBeCloseTo(0.6, 2);
    expect(bandStep(trace, 3)).toMatchObject({ step: 23 });
    expect(bandStep(trace, 3).x).toBeCloseTo(1.88, 2);
    expect(bandStep(trace, 4)).toMatchObject({ step: 32 });
    expect(bandStep(trace, 4).x).toBeCloseTo(3.23, 2);
  });

  it('is exactly 12 from step 36 (4.00 tiles) and stays 12', () => {
    const full = vxStep(trace, 12);
    expect(full.step).toBe(36);
    expect(full.x).toBeCloseTo(4.0, 2);
    expect(trace.slice(35).every((s) => s.vx === 12)).toBe(true);
  });

  it('is never red below 3.0 tiles (2.5-tile runways deny red)', () => {
    expect(trace.filter((s) => s.x < 3).every((s) => s.band < 4)).toBe(true);
  });

  it('never exceeds the selected gear speed (check 2)', () => {
    expect(trace.every((s) => s.vx <= speedOf(rampGear(s.step)))).toBe(true);
  });

  it('matches holding gear 4 from standing (GDD §5.1) step for step', () => {
    const gear4 = runGround(params, 0, 120, hold(12));
    expect(gear4.map((s) => s.vx)).toEqual(trace.map((s) => s.vx));
  });

  it('mirrors exactly to the left (check 13)', () => {
    const left = runGround(params, 0, 120, (step) => -speedOf(rampGear(step)));
    left.forEach((s, i) => {
      expect(s.band).toBe(trace[i]?.band);
      expect(s.x).toBe(-(trace[i]?.x as number));
    });
  });
});

describe('movement-and-gears check 3: walking is instant', () => {
  it('starts, stops, starts left and turns at walking pace in one step each', () => {
    const plan = [3, 0, -3, -3, 3];
    const trace = runGround(params, 0, plan.length, (step) => plan[step - 1] as number);
    expect(trace.map((s) => s.vx)).toEqual([3, 0, -3, -3, 3]);
  });
});

describe('movement-and-gears check 4 and GDD §5.1: one gear up from cruise', () => {
  it('9 -> 12: red on step 4 (0.66), exactly 12 on step 8 (1.42)', () => {
    const trace = runGround(params, 9, 20, hold(12));
    expect(bandStep(trace, 4)).toMatchObject({ step: 4 });
    expect(bandStep(trace, 4).x).toBeCloseTo(0.66, 2);
    expect(vxStep(trace, 12)).toMatchObject({ step: 8 });
    expect(vxStep(trace, 12).x).toBeCloseTo(1.42, 2);
  });

  // 6 -> 9: speed lands exactly on the 7.5 edge on step 5 (6 + 5 * 0.3), which is yellow.
  it('6 -> 9: yellow on step 5 (0.56)', () => {
    const yellow = bandStep(runGround(params, 6, 20, hold(9)), 3);
    expect(yellow.step).toBe(5);
    expect(yellow.x).toBeCloseTo(0.56, 2);
  });

  it.each([
    [3, 6, 2, 9, 0.57],
    [9, 12, 4, 4, 0.66],
  ])('%i -> %i: band %i after %i steps (%f tiles), new cruise within 1.25-1.42 tiles', (from, to, band, steps, dist) => {
    const trace = runGround(params, from, 40, hold(to));
    expect(bandStep(trace, band)).toMatchObject({ step: steps });
    expect(bandStep(trace, band).x).toBeCloseTo(dist, 2);
    const cruise = vxStep(trace, to).x;
    expect(cruise).toBeGreaterThanOrEqual(1.25 - 0.005);
    expect(cruise).toBeLessThanOrEqual(1.42 + 0.005);
  });
});

describe('movement-and-gears checks 5-6 and GDD §5.2: letting go', () => {
  it('from sprint: yellow 4 (0.74), green 12 (1.91), blue 26 (3.24), exactly 0 on step 35 (3.74)', () => {
    const trace = runGround(params, 12, 60, hold(0));
    const expected: ReadonlyArray<readonly [number, number, number]> = [
      [3, 4, 0.74],
      [2, 12, 1.91],
      [1, 26, 3.24],
      [0, 35, 3.74],
    ];
    for (const [band, step, x] of expected) {
      expect(bandStep(trace, band).step).toBe(step);
      expect(bandStep(trace, band).x).toBeCloseTo(x, 2);
    }
    expect(vxStep(trace, 0).step).toBe(35);
    expect(trace.slice(34).every((s) => s.vx === 0)).toBe(true);
  });

  // Step 5 ends exactly on the 7.5 edge (9 - 5 * 0.3), still yellow, so green is step 6.
  it('from run (gear 3): green 6 (0.81), blue 19 (2.03), white 28 (2.54)', () => {
    const trace = runGround(params, 9, 60, hold(0));
    expect([2, 1, 0].map((b) => bandStep(trace, b).step)).toEqual([6, 19, 28]);
    expect(bandStep(trace, 2).x).toBeCloseTo(0.81, 2);
    expect(bandStep(trace, 1).x).toBeCloseTo(2.03, 2);
    expect(bandStep(trace, 0).x).toBeCloseTo(2.54, 2);
  });

  it('from jog (check 6): blue on step 9 (0.78), exactly 0 on step 18 (1.29)', () => {
    const trace = runGround(params, 6, 40, hold(0));
    expect(bandStep(trace, 1)).toMatchObject({ step: 9 });
    expect(bandStep(trace, 1).x).toBeCloseTo(0.78, 2);
    expect(vxStep(trace, 0)).toMatchObject({ step: 18 });
    expect(vxStep(trace, 0).x).toBeCloseTo(1.29, 2);
  });

  it('from walk: stops on step 1', () => {
    const [stop] = runGround(params, 3, 1, hold(0));
    expect(stop).toMatchObject({ vx: 0, band: 0 });
    expect(stop?.x).toBeCloseTo(0.025, 12);
  });
});

describe('movement-and-gears check 7: downshift while holding', () => {
  it('4 -> 1 on steps 1, 3, 5: blue on step 26 (3.24), exactly 3 from step 34 (3.72)', () => {
    const target = (step: number): number => (step >= 5 ? 3 : step >= 3 ? 6 : 9);
    const trace = runGround(params, 12, 80, target);
    expect(bandStep(trace, 1)).toMatchObject({ step: 26 });
    expect(bandStep(trace, 1).x).toBeCloseTo(3.24, 2);
    expect(vxStep(trace, 3)).toMatchObject({ step: 34 });
    expect(vxStep(trace, 3).x).toBeCloseTo(3.72, 2);
    expect(trace.slice(33).every((s) => s.vx === 3)).toBe(true);
  });

  it('brakes at the same rate as letting go until the new target is reached', () => {
    const down = runGround(params, 12, 25, hold(3));
    const release = runGround(params, 12, 25, hold(0));
    expect(down.map((s) => s.vx)).toEqual(release.map((s) => s.vx));
  });
});

describe('movement-and-gears check 8: hold again in gear 3 from standing', () => {
  it('reaches exactly 9 on step 28, 2.57 tiles later', () => {
    const trace = runGround(params, 0, 60, hold(9));
    expect(vxStep(trace, 9)).toMatchObject({ step: 28 });
    expect(vxStep(trace, 9).x).toBeCloseTo(2.57, 2);
  });

  it('re-accelerates from the current speed (no instant step) after letting go briefly', () => {
    const trace = runGround(params, 12, 6, (step) => (step <= 3 ? 0 : 12));
    expect(trace[3]?.vx).toBeCloseTo((trace[2]?.vx as number) + params.accel[3] * params.dt, 12);
  });
});

describe('movement-and-gears check 9 and GDD §5.2: reversal', () => {
  it.each([
    [12, 35, 3.72, 70, -0.25],
    [9, 28, 2.52, 55, -0.03],
    [6, 18, 1.27, 35, -0.02],
  ])('from %i: turn on step %i (%f skidded), full speed back on step %i, net %f', (v, turn, skid, back, net) => {
    const trace = runGround(params, v, 120, hold(-v));
    const turned = firstWhere(trace, (s) => s.vx < 0);
    expect(turned.step).toBe(turn);
    expect(turned.vx).toBe(-3);
    expect(Math.max(...trace.map((s) => s.x))).toBeCloseTo(skid, 2);
    const before = trace.slice(0, turn - 1);
    expect(before.every((s, i) => s.vx > 0 && (i === 0 || s.vx < (before[i - 1]?.vx as number)))).toBe(true);
    expect(vxStep(trace, -v)).toMatchObject({ step: back });
    expect(vxStep(trace, -v).x).toBeCloseTo(net, 2);
  });

  it('passes through every band once each way from sprint, never white', () => {
    const trace = runGround(params, 12, 80, hold(-12));
    expect(bandSequence(4, trace)).toEqual([4, 3, 2, 1, 2, 3, 4]);
  });

  it('from walk: turns on step 1 with no skid', () => {
    expect(runGround(params, 3, 1, hold(-3))[0]?.vx).toBe(-3);
  });

  it('letting go mid-skid keeps braking to a stop', () => {
    const skid = runGround(params, 12, 40, (step) => (step <= 10 ? -12 : 0));
    const release = runGround(params, 12, 40, hold(0));
    expect(skid.map((s) => s.vx)).toEqual(release.map((s) => s.vx));
  });
});

describe('air-drag checks 1-3 and GDD §5.3: flat jumps (48 flight steps, from the spec)', () => {
  const FLAT = 48;

  it('gear 4: drops to exactly 9 and gear 3 on flight step 30, lands 8.7 tiles out', () => {
    const flight = runFlight(params, 12, 4, FLAT);
    const drop = firstWhere(flight, (s) => s.dropped);
    expect(drop).toMatchObject({ step: 30, vx: 9, gear: 3, band: 3 });
    expect(flight.filter((s) => s.dropped)).toHaveLength(1);
    expect(flight[FLAT - 1]?.x).toBeCloseTo(8.7, 1);
  });

  it('gear 4 after landing, still holding: |vx| stays 9 for 60 steps in gear 3', () => {
    const after = runGround(params, 9, 60, hold(speedOf(3)));
    expect(after.every((s) => s.vx === 9 && s.band === 3)).toBe(true);
  });

  it('gear 2: no drop, lands 4.8 out at 6 in gear 2', () => {
    const flight = runFlight(params, 6, 2, FLAT);
    expect(flight.some((s) => s.dropped)).toBe(false);
    expect(flight[FLAT - 1]).toMatchObject({ vx: 6, gear: 2 });
    expect(flight[FLAT - 1]?.x).toBeCloseTo(4.8, 1);
  });

  it('gear 3: drops on flight step 40 to 6, lands 6.8 out in band 2, gear 2', () => {
    const flight = runFlight(params, 9, 3, FLAT);
    expect(firstWhere(flight, (s) => s.dropped)).toMatchObject({ step: 40, vx: 6 });
    expect(flight[FLAT - 1]).toMatchObject({ band: 2, gear: 2 });
    expect(flight[FLAT - 1]?.x).toBeCloseTo(6.8, 1);
  });

  it('red mid-ramp (10.5): drops on step 35 to 9, lands 8.075 out yellow', () => {
    const flight = runFlight(params, 10.5, 4, FLAT);
    expect(firstWhere(flight, (s) => s.dropped)).toMatchObject({ step: 35, vx: 9 });
    expect(flight[FLAT - 1]).toMatchObject({ band: 3 });
    expect(flight[FLAT - 1]?.x).toBeCloseTo(8.075, 3);
  });

  it('gear 1: lands 2.4 out, blue', () => {
    const flight = runFlight(params, 3, 1, FLAT);
    expect(flight[FLAT - 1]).toMatchObject({ vx: 3, band: 1 });
    expect(flight[FLAT - 1]?.x).toBeCloseTo(2.4, 1);
  });

  it('check 7: a standing jump stays at 0, band 0, gear 1', () => {
    const flight = runFlight(params, 0, 1, FLAT);
    expect(flight.every((s) => s.vx === 0 && s.band === 0 && s.gear === 1)).toBe(true);
  });
});

describe('air-drag checks 5, 6, 9, 10, 12', () => {
  it('check 5: two drops on flight steps 30 and 70, ending at 6 (band 2)', () => {
    const flight = runFlight(params, 12, 4, 100);
    expect(flight.filter((s) => s.dropped).map((s) => s.step)).toEqual([30, 70]);
    expect(flight[99]).toMatchObject({ vx: 6, band: 2, gear: 2 });
  });

  it('check 6: a gear-1 flyer keeps exactly 3 for any flight', () => {
    const flight = runFlight(params, 3, 1, 400);
    expect(flight.every((s) => s.vx === 3 && !s.dropped)).toBe(true);
  });

  it('check 9: landing at 9 with nothing held stops 2.54 tiles later on step 28', () => {
    const trace = runGround(params, 9, 40, hold(0));
    expect(vxStep(trace, 0)).toMatchObject({ step: 28 });
    expect(vxStep(trace, 0).x).toBeCloseTo(2.54, 2);
    expect(bandSequence(3, trace)).toEqual([3, 2, 1, 0]);
  });

  it('check 10: a fresh flight launched at 9 first drops on its step 40', () => {
    expect(firstWhere(runFlight(params, 9, 3, 48), (s) => s.dropped).step).toBe(40);
  });

  it('check 12: gear 2 at red takeoff stays 2 for the whole flight', () => {
    expect(runFlight(params, 12, 2, 48).every((s) => s.gear === 2)).toBe(true);
  });

  it('check 11: gear 4 launched at band 3 (run step 26 of the ramp) is gear 3 at launch', () => {
    const launchVx = runGround(params, 0, 26, (step) => speedOf(rampGear(step)))[25]?.vx as number;
    const flight = runFlight(params, launchVx, 4, 48);
    expect(flight[0]).toMatchObject({ band: 3, gear: 3 });
    expect(flight[47]?.gear).toBeLessThanOrEqual(3);
  });
});
