import { describe, expect, it } from 'vitest';
import type { PlayerState } from '../core/types';
import { PLAYER_ANIMS, PLAYER_FRAMES } from '../fx';
import { oneShotIndex, playerFrame, RUN_FRAMES_PER_TILE } from './playerFrame';

function makePlayer(over: Partial<PlayerState> = {}): PlayerState {
  return {
    x: 0.5,
    y: 5,
    vx: 0,
    vy: 0,
    gear: 1,
    band: 0,
    facing: 1,
    moveDir: 0,
    grounded: true,
    coyoteSteps: 0,
    jumpBufferSteps: 0,
    shiftBufferSteps: 0,
    shiftBufferNet: 0,
    graceSteps: 0,
    graceBand: null,
    airDistance: 0,
    home: false,
    ...over,
  };
}

const frameNames = new Set(PLAYER_FRAMES.map((f) => f.name));
const suffix = (name: string): string => name.split('/').slice(3).join('/');
const frameOf = (p: PlayerState, opts = {}): string => suffix(playerFrame(p, 'runner', opts).name);

describe('playerFrame', () => {
  it('stands on idle_0 in the white band', () => {
    expect(playerFrame(makePlayer(), 'runner')).toEqual({ name: 'player/runner/white/idle_0', flipX: false });
  });

  it('names the body and the band of the actual speed', () => {
    expect(playerFrame(makePlayer({ vx: 6, band: 2, x: 0 }), 'twin').name).toBe('player/twin/green/run_0');
  });

  it('flips when facing left', () => {
    expect(playerFrame(makePlayer({ facing: -1 }), 'runner').flipX).toBe(true);
  });

  it('runs in blue and green and sprints in yellow and red', () => {
    expect(frameOf(makePlayer({ vx: 3, band: 1 }))).toMatch(/^run_/);
    expect(frameOf(makePlayer({ vx: 9, band: 3 }))).toMatch(/^sprint_/);
    expect(frameOf(makePlayer({ vx: 12, band: 4 }))).toMatch(/^sprint_/);
  });

  it('advances the run cycle with distance only (same x, same frame)', () => {
    const at = (x: number): string => frameOf(makePlayer({ vx: 6, band: 2, x }));
    expect(at(0)).toBe('run_0');
    expect(at(1 / RUN_FRAMES_PER_TILE)).toBe('run_1');
    expect(at(1 / RUN_FRAMES_PER_TILE - 0.001)).toBe('run_0');
    expect(at(6 / RUN_FRAMES_PER_TILE)).toBe('run_0');
    expect(at(1.234)).toBe(at(1.234));
  });

  it('cycles forward in the direction of travel when running left', () => {
    const left = (x: number): string => frameOf(makePlayer({ vx: -6, band: 2, x, facing: -1 }));
    expect(left(0)).toBe('run_0');
    expect(left(-1 / RUN_FRAMES_PER_TILE)).toBe('run_1');
    expect(left(-100)).toMatch(/^run_[0-5]$/);
  });

  it('shows jump while rising and fall while falling or at the apex', () => {
    expect(frameOf(makePlayer({ grounded: false, vy: -5 }))).toBe('jump_1');
    expect(frameOf(makePlayer({ grounded: false, vy: 0 }))).toBe('fall_0');
    expect(frameOf(makePlayer({ grounded: false, vy: 8 }))).toBe('fall_0');
  });

  it('skids when the held direction opposes the leg velocity on the ground', () => {
    expect(frameOf(makePlayer({ vx: 9, band: 3, moveDir: -1 }))).toBe('skid_0');
    expect(frameOf(makePlayer({ vx: 9, band: 3, moveDir: 1 }))).toMatch(/^sprint_/);
    expect(frameOf(makePlayer({ vx: 9, band: 3, moveDir: -1, grounded: false }))).toBe('fall_0');
  });

  it('parks a home body on park_0 and ignores one-shot poses', () => {
    const p = makePlayer({ home: true, vx: 9, band: 3, grounded: false });
    expect(playerFrame(p, 'twin', { transient: { anim: 'land', age: 0 } }).name).toBe('player/twin/yellow/park_0');
  });

  it('plays a one-shot pose, then falls back to the state frame', () => {
    const p = makePlayer();
    expect(frameOf(p, { transient: { anim: 'land', age: 0 } })).toBe('land_0');
    expect(frameOf(p, { transient: { anim: 'land', age: 7 } })).toBe('land_1');
    expect(frameOf(p, { transient: { anim: 'land', age: 60 } })).toBe('idle_0');
  });

  it('plays the death frames in order and holds the last one', () => {
    const at = (age: number): string => frameOf(makePlayer(), { deathAge: age });
    expect(at(0)).toBe('death_0');
    expect(at(15)).toBe('death_2');
    expect(at(1000)).toBe('death_3');
  });

  it('only names frames that exist in the atlas', () => {
    const cases = [
      makePlayer(),
      makePlayer({ vx: 3, band: 1 }),
      makePlayer({ vx: 12, band: 4, x: 123.7 }),
      makePlayer({ grounded: false, vy: -3 }),
      makePlayer({ home: true }),
      makePlayer({ vx: 9, band: 3, moveDir: -1 }),
    ];
    for (const p of cases) expect(frameNames.has(frameOf(p))).toBe(true);
    for (const a of PLAYER_ANIMS) {
      for (let age = 0; age < 40; age += 3) {
        const n = oneShotIndex(a.name, age);
        if (n !== null) expect(frameNames.has(`${a.name}_${n}`)).toBe(true);
      }
    }
  });
});
