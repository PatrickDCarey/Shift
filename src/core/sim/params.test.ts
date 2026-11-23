import { describe, expect, it } from 'vitest';
import { paramsForTests } from '../motion/testkit';
import { deriveParams } from './params';
import { tuning } from './testkit';

describe('deriveParams', () => {
  const params = deriveParams(tuning);

  it('agrees field for field with the motion lane test stand-in', () => {
    expect(params).toEqual({ ...paramsForTests(tuning), projectileSize: tuning.projectileSizeTiles });
  });

  it('derives gravity 37.5 and launch speed 15 (jump check 4)', () => {
    expect(params.gravity).toBeCloseTo(37.5, 9);
    expect(params.jumpSpeed).toBeCloseTo(15, 9);
  });

  it('derives accel = brake = 10.8, 18.0, 25.2 for segments 1-3 (movement check 16)', () => {
    for (const rates of [params.accel, params.brake]) {
      expect(rates[1]).toBeCloseTo(10.8, 9);
      expect(rates[2]).toBeCloseTo(18.0, 9);
      expect(rates[3]).toBeCloseTo(25.2, 9);
    }
  });

  it('converts ms to whole steps with round(ms * stepHz / 1000)', () => {
    expect(params).toMatchObject({
      dt: 1 / 60,
      coyoteSteps: 6,
      jumpBufferSteps: 6,
      shiftBufferSteps: 6,
      colorGraceSteps: 6,
      deathFreezeSteps: 24,
      projectileSize: 0.5,
      playerWidth: 0.75,
      playerHeight: 1.5,
    });
    expect(deriveParams({ ...tuning, coyoteMs: 108 }).coyoteSteps).toBe(6);
    expect(deriveParams({ ...tuning, coyoteMs: 109 }).coyoteSteps).toBe(7);
  });

  it('uses the rounded apex time so the apex lands on a whole step', () => {
    const p = deriveParams({ ...tuning, jumpTimeToApexMs: 405 });
    expect(p.jumpSpeed).toBeCloseTo(2 * 3 / (24 / 60), 9);
  });

  it('fails fast with the schema messages on invalid tuning', () => {
    expect(() => deriveParams({ ...tuning, stepHz: 0 })).toThrow(/tuning\.stepHz/);
    expect(() => deriveParams({ ...tuning, jumpTimeToApexMs: 5 })).toThrow(/jumpTimeToApexMs/);
  });
});
