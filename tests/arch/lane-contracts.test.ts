/**
 * Each src/core lane publishes only its contract (src/core/contracts/lanes.ts):
 * no unlisted exports, and every listed export has the contract's signature.
 * All three lanes are implemented (b97708e, b190192), so REQUIRE_COMPLETE is
 * on: a missing export fails too, except names in LANE_PENDING (contract
 * landed, lane sitting still open; expansion 2026-11-23). The six motion
 * path functions came off LANE_PENDING in B11-15 (paths.ts reviewed). Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import * as level from '../../src/core/level';
import * as motion from '../../src/core/motion';
import * as sim from '../../src/core/sim';
import { LANE_EXPORTS, LANE_PENDING, type LevelLaneApi, type MotionApi, type SimLaneApi } from '../../src/core/types';

/** On since every lane is implemented (tech-lead review 2026-11-02). */
const REQUIRE_COMPLETE = true;

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
  it('pending names are contract names', () => {
    for (const [lane, names] of Object.entries(LANE_PENDING)) {
      const listed: readonly string[] = LANE_EXPORTS[lane as keyof typeof LANE_EXPORTS];
      expect(names.filter((n: string) => !listed.includes(n))).toEqual([]);
    }
  });

  it('compile-time checks hold', () => {
    expect([simConforms, motionConforms, levelConforms, simListed, motionListed, levelListed]).not.toContain(false);
  });

  it.each(Object.entries(MODULES))('%s exports only contract names', (lane, mod) => {
    const allowed: readonly string[] = LANE_EXPORTS[lane as keyof typeof LANE_EXPORTS];
    expect(Object.keys(mod).filter((name) => !allowed.includes(name))).toEqual([]);
    for (const name of Object.keys(mod)) expect(typeof (mod as Record<string, unknown>)[name]).toBe('function');
  });

  it.runIf(REQUIRE_COMPLETE).each(Object.entries(MODULES))('%s exports its whole contract', (lane, mod) => {
    const key = lane as keyof typeof LANE_EXPORTS;
    const pending: readonly string[] = LANE_PENDING[key];
    const required = LANE_EXPORTS[key].filter((name: string) => !pending.includes(name));
    expect(required.filter((name: string) => !(name in mod))).toEqual([]);
  });
});
