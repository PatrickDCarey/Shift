import { describe, expect, it } from 'vitest';
import { createSim, deriveParams, EMPTY_INPUT, isTuning, step, tuningErrors } from '../core';
import tuningJson from '../data/tuning.json';
import { advanceClock, easeToward, lerp, MAX_STEPS_PER_FRAME, renderPosition } from './interpolation';
import { gridLevel } from './testkit';

const STEP = 1000 / 60;

describe('advanceClock', () => {
  it('runs no step until a full step of time has accumulated', () => {
    const a = advanceClock(0, 10, STEP);
    expect(a.steps).toBe(0);
    expect(a.alpha).toBeCloseTo(10 / STEP);
  });

  it('carries the remainder between frames', () => {
    const a = advanceClock(0, 10, STEP);
    const b = advanceClock(a.acc, 10, STEP);
    expect(b.steps).toBe(1);
    expect(b.acc).toBeCloseTo(20 - STEP);
  });

  it('runs one step per 60 Hz frame without drifting, including float error', () => {
    let acc = 0;
    let total = 0;
    for (let i = 0; i < 600; i += 1) {
      const a = advanceClock(acc, STEP, STEP);
      acc = a.acc;
      total += a.steps;
    }
    expect(total).toBe(600);
  });

  it('runs two steps per frame on a 30 Hz display', () => {
    expect(advanceClock(0, 2 * STEP, STEP).steps).toBe(2);
  });

  it('runs about one step in two frames on a 120 Hz display', () => {
    const a = advanceClock(0, STEP / 2, STEP);
    const b = advanceClock(a.acc, STEP / 2, STEP);
    expect([a.steps, b.steps]).toEqual([0, 1]);
  });

  it('caps a tab stall at MAX_STEPS_PER_FRAME', () => {
    const a = advanceClock(0, 60_000, STEP);
    expect(a.steps).toBe(MAX_STEPS_PER_FRAME);
    expect(a.alpha).toBeLessThan(1);
  });

  it('ignores negative deltas', () => {
    expect(advanceClock(0, -5, STEP)).toEqual({ steps: 0, acc: 0, alpha: 0 });
  });
});

describe('lerp and easeToward', () => {
  it('interpolates', () => {
    expect(lerp(2, 6, 0)).toBe(2);
    expect(lerp(2, 6, 0.25)).toBe(3);
    expect(lerp(2, 6, 1)).toBe(6);
  });

  it('eases toward the target without overshooting', () => {
    const a = easeToward(0, 10, 100, 100);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(10);
    expect(easeToward(0, 10, 100000, 100)).toBeCloseTo(10);
    expect(easeToward(3, 10, 16, 0)).toBe(10);
  });
});

describe('renderPosition', () => {
  if (!isTuning(tuningJson)) throw new Error(tuningErrors(tuningJson).join('; '));
  const params = deriveParams(tuningJson);
  const level = gridLevel(['.......E', '.@......', '########']);
  const right = { ...EMPTY_INPUT, right: true };

  it('blends between consecutive playing states', () => {
    const s0 = createSim(level, params);
    const s1 = step(s0, right, level, params);
    expect(s1.player.x).toBeGreaterThan(s0.player.x);
    const mid = renderPosition(s0, s1, 0.5);
    expect(mid.x).toBeCloseTo((s0.player.x + s1.player.x) / 2);
    expect(renderPosition(s0, s1, 0).x).toBe(s0.player.x);
    expect(renderPosition(s0, s1, 1).x).toBe(s1.player.x);
  });

  it('does not blend across a restart or respawn', () => {
    let s = createSim(level, params);
    for (let i = 0; i < 30; i += 1) s = step(s, right, level, params);
    const moved = s;
    const restarting = step(moved, { ...EMPTY_INPUT, restart: true }, level, params);
    const respawned = step(restarting, EMPTY_INPUT, level, params);
    expect(respawned.step).toBe(0);
    expect(renderPosition(restarting, respawned, 0.5).x).toBe(respawned.player.x);
    expect(renderPosition(moved, restarting, 0.5).x).toBe(restarting.player.x);
  });
});
