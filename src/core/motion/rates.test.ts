import { describe, expect, it } from 'vitest';
import tuningJson from '../../data/tuning.json';
import { segmentRates } from './rates';
import { paramsFromJson } from './testkit';

const params = paramsFromJson(tuningJson);

describe('segmentRates (movement-and-gears check 16)', () => {
  it('derives accel = brake = 10.8, 18.0, 25.2 for segments 1-3 from the shipped tuning', () => {
    for (const rates of [params.accel, params.brake]) {
      expect(Math.abs(rates[1] - 10.8)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(rates[2] - 18.0)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(rates[3] - 25.2)).toBeLessThanOrEqual(1e-9);
    }
  });

  it('also computes segment 0 (0 to walking pace), unused by the instant range', () => {
    expect(segmentRates(params.gearSpeeds, 1.25)[0]).toBeCloseTo(3.6, 12);
  });

  it('crossing a segment at its rate takes exactly tilesPerSegment (v1^2 - v0^2 = 2as)', () => {
    const v = [0, 2, 5, 7, 11] as const;
    const rates = segmentRates(v, 2);
    rates.forEach((a, n) => {
      const lo = v[n] as number;
      const hi = v[n + 1] as number;
      expect((hi * hi - lo * lo) / (2 * a)).toBeCloseTo(2, 12);
    });
  });

  it('scales inversely with the segment length', () => {
    const short = segmentRates(params.gearSpeeds, 0.5);
    const long = segmentRates(params.gearSpeeds, 1);
    short.forEach((a, n) => expect(a).toBeCloseTo(2 * (long[n] as number), 12));
  });
});
