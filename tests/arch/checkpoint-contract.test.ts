/**
 * Checkpoint contract stays additive (contracts/checkpoints.ts, 2026-11-24):
 * `Level.checkpoints` and `SimState.checkpoint` are optional, so every
 * pre-checkpoint level and state still type-checks and hashes unchanged.
 * Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import {
  CHECKPOINT_MIN_FROM_START,
  CHECKPOINT_MIN_SPACING,
  LANE_EXPORTS,
  LANE_PENDING,
  MAX_CHECKPOINT_CLOCK,
  MAX_CHECKPOINTS,
  type Level,
  type SimState,
} from '../../src/core/types';

// Compile time: both fields are optional (a value without them is still a Level / SimState).
type IsOptional<T, K extends keyof T> = Omit<T, K> extends T ? true : false;
const levelOptional: IsOptional<Level, 'checkpoints'> = true;
const stateOptional: IsOptional<SimState, 'checkpoint'> = true;

describe('checkpoint contract', () => {
  it('adds only optional fields', () => {
    expect([levelOptional, stateOptional]).toEqual([true, true]);
  });

  it('has sane limits', () => {
    expect(MAX_CHECKPOINTS).toBe(4);
    expect(CHECKPOINT_MIN_FROM_START).toBeGreaterThan(0);
    expect(CHECKPOINT_MIN_SPACING).toBeGreaterThan(CHECKPOINT_MIN_FROM_START);
    expect(MAX_CHECKPOINT_CLOCK).toBe(36_000);
  });

  it('publishes kineticStep from the sim lane', () => {
    expect(LANE_EXPORTS.sim).toContain('kineticStep');
    expect(LANE_PENDING.sim).toEqual([]); // landed and reviewed (batch 11 checkpoint review)
  });
});
