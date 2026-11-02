/**
 * Each src/core lane publishes only its contract (src/core/contracts/lanes.ts):
 * no unlisted exports, and every listed export has the contract's signature.
 * Lanes may still be incomplete (M1 in progress); at the M1 gate tech-lead
 * flips REQUIRE_COMPLETE so a missing export fails too. Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import * as level from '../../src/core/level';
import * as motion from '../../src/core/motion';
import * as sim from '../../src/core/sim';
import { LANE_EXPORTS, type LevelLaneApi, type MotionApi, type SimLaneApi } from '../../src/core/types';

/** Set to true once all lanes are implemented (M1 gate). */
const REQUIRE_COMPLETE = false;

// --- Compile time: every export that exists matches the contract signature ---
type Conforms<M, Api> = { [K in keyof M]: K extends keyof Api ? (M[K] extends Api[K] ? true : false) : false };
type AllTrue<T> = false extends T[keyof T] ? false : true;
const simConforms: AllTrue<Conforms<typeof sim, SimLaneApi>> = true;
const motionConforms: AllTrue<Conforms<typeof motion, MotionApi>> = true;
const levelConforms: AllTrue<Conforms<typeof level, LevelLaneApi>> = true;

// --- Compile time: LANE_EXPORTS lists every contract member ---
type Listed<L extends readonly unknown[]> = L[number];
const simListed: Exclude<keyof SimLaneApi, Listed<typeof LANE_EXPORTS.sim>> extends never ? true : false = true;
const motionListed: Exclude<keyof MotionApi, Listed<typeof LANE_EXPORTS.motion>> extends never ? true : false = true;
const levelListed: Exclude<keyof LevelLaneApi, Listed<typeof LANE_EXPORTS.level>> extends never ? true : false = true;

const MODULES = { sim, motion, level } as const;

describe('src/core lane contracts', () => {
  it('compile-time checks hold', () => {
    expect([simConforms, motionConforms, levelConforms, simListed, motionListed, levelListed]).not.toContain(false);
  });

  it.each(Object.entries(MODULES))('%s exports only contract names', (lane, mod) => {
    const allowed: readonly string[] = LANE_EXPORTS[lane as keyof typeof LANE_EXPORTS];
    expect(Object.keys(mod).filter((name) => !allowed.includes(name))).toEqual([]);
    for (const name of Object.keys(mod)) expect(typeof (mod as Record<string, unknown>)[name]).toBe('function');
  });

  it.runIf(REQUIRE_COMPLETE).each(Object.entries(MODULES))('%s exports its whole contract', (lane, mod) => {
    const allowed: readonly string[] = LANE_EXPORTS[lane as keyof typeof LANE_EXPORTS];
    expect(Object.keys(mod).sort()).toEqual([...allowed].sort());
  });
});
