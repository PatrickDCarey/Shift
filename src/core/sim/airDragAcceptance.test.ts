/**
 * docs/design/features/air-drag.md acceptance checks 1-15 through the real
 * `step`. Flight step k = k-th state from the launch step; the direction
 * stays held unless stated.
 */
import { describe, expect, it } from 'vitest';
import type { InputFrame, SimState } from '../types';
import { createSim } from './create';
import { at, cruise, eventTypes, firstStep, frame, gridLevel, params, repeat, room, row, runFrames, runFromSpawn } from './testkit';

const level = room(400, 2);
const has = (type: string) => (s: SimState): boolean => eventTypes(s).includes(type);
const landStep = (states: readonly SimState[]): number => firstStep(states, has('land'));
const dropSteps = (states: readonly SimState[]): number[] =>
  states.flatMap((s, i) => (has('airDrag')(s) ? [i + 1] : []));

/** Upper floor (row 10) on cols 0..edge-1 over a lower floor `drop` rows below; spawn (2, 9). */
function ledge(edge: number, drop: number, width = 200): ReturnType<typeof gridLevel> {
  const height = 10 + drop + 2;
  return gridLevel(
    Array.from({ length: height }, (_, r) => {
      if (r === 0) return row(width, '.', { [width - 1]: 'E' });
      if (r === 9) return row(width, '.', { 2: '@' });
      if (r === 10) return row(width, '.', { 0: '#'.repeat(edge) });
      return row(width, r >= 10 + drop ? '#' : '.');
    }),
  );
}

const sprintJump = (frames: readonly InputFrame[] = repeat(140, 'R')): { start: SimState; s: SimState[] } => {
  const start = cruise(level, 4);
  return { start, s: runFrames(level, start, [frame('RJ'), ...frames]) };
};

describe('air-drag check 1: sprint jump, flat', () => {
  const { start, s } = sprintJump();
  it('drop on flight step 30 to |vx| = 9, gear 3', () => {
    expect(dropSteps(s.slice(0, landStep(s)))).toEqual([30]);
    expect(at(s, 30).player).toMatchObject({ vx: 9, gear: 3, band: 3 });
    expect(at(s, 29).player.vx).toBe(12);
  });

  it('lands on flight step 48, 8.7 tiles from launch x; then band 3, gear 3, |vx| 9 for 60 steps', () => {
    expect(landStep(s)).toBe(48);
    expect(at(s, 48).player.x - start.player.x).toBeCloseTo(8.7, 2);
    expect(s.slice(48, 108).every((t) => t.player.vx === 9 && t.player.band === 3 && t.player.gear === 3)).toBe(true);
  });
});

describe('air-drag check 2-3: jog and run jumps', () => {
  it('gear 2: no drop; lands 4.8 out, |vx| 6, gear 2', () => {
    const start = cruise(level, 2);
    const s = runFrames(level, start, [frame('RJ'), ...repeat(60, 'R')]);
    const l = landStep(s);
    expect(dropSteps(s)).toEqual([]);
    expect(at(s, l).player.x - start.player.x).toBeCloseTo(4.8, 2);
    expect(at(s, l).player).toMatchObject({ vx: 6, gear: 2 });
  });

  it('gear 3: drop on flight step 40 to 6; lands 6.8 out in band 2, gear 2', () => {
    const start = cruise(level, 3);
    const s = runFrames(level, start, [frame('RJ'), ...repeat(60, 'R')]);
    const l = landStep(s);
    expect(dropSteps(s.slice(0, l))).toEqual([40]);
    expect(at(s, 40).player.vx).toBe(6);
    expect(at(s, l).player.x - start.player.x).toBeCloseTo(6.8, 2);
    expect(at(s, l).player).toMatchObject({ band: 2, gear: 2 });
  });
});

describe('air-drag check 4: walk-off keeps red', () => {
  it('gear 4 off a 4-tile ledge: lands 5.6 tiles out, |vx| 12, band 4', () => {
    const lvl = ledge(30, 4);
    const s = runFrames(lvl, cruise(lvl, 4), repeat(120, 'R'));
    const off = firstStep(s, (t) => !t.player.grounded);
    const l = landStep(s);
    // Pinned: 29 airborne steps (phase 6 gravity starts the step after the
    // walk-off, which phase 8 detects), 5.8 from the last grounded x. Measured
    // from the ledge edge (centre when the box's back edge leaves it) it is
    // inside the ±0.15 tolerance of 5.6.
    expect(l - off + 1).toBe(29);
    expect(at(s, l).player.x - at(s, off - 1).player.x).toBeCloseTo(5.8, 9);
    const fromEdge = at(s, l).player.x - (30 + params.playerWidth / 2);
    expect(fromEdge).toBeCloseTo(5.722, 3);
    expect(Math.abs(fromEdge - 5.6)).toBeLessThanOrEqual(0.15);
    expect(at(s, l).player).toMatchObject({ vx: 12, band: 4, y: 14 });
  });
});

describe('air-drag check 5: two drops', () => {
  it('gear 4 jump off a ledge onto ground 7 lower: drops on flight steps 30 and 70; lands |vx| 6, band 2', () => {
    const lvl = ledge(20, 7);
    const s = runFrames(lvl, cruise(lvl, 4), [frame('RJ'), ...repeat(120, 'R')]);
    const l = landStep(s);
    expect(dropSteps(s.slice(0, l))).toEqual([30, 70]);
    expect(l).toBeGreaterThanOrEqual(70);
    expect(at(s, l).player).toMatchObject({ vx: 6, band: 2, y: 17 });
  });
});

describe('air-drag check 6: drag floor', () => {
  it('gear 1 into a 40-tile drop: |vx| = 3 on every airborne step and on landing', () => {
    const lvl = ledge(12, 40, 60);
    const s = runFrames(lvl, cruise(lvl, 1, 'R', 10), repeat(400, 'R'));
    const off = firstStep(s, (t) => !t.player.grounded);
    const l = landStep(s);
    expect(l).toBeGreaterThan(off);
    expect(s.slice(off - 1, l).every((t) => t.player.vx === 3)).toBe(true);
    expect(at(s, l).player.y).toBe(50);
  });
});

describe('air-drag check 7: standing jump', () => {
  it('vx 0 throughout, band 0, gear 1', () => {
    const s = runFromSpawn(level, [frame('J'), ...repeat(60, '')]);
    expect(s.every((t) => t.player.vx === 0 && t.player.band === 0 && t.player.gear === 1)).toBe(true);
  });
});

describe('air-drag check 8: no steering', () => {
  it('holding L or nothing during the flight gives the same vx, x, y as check 1 up to landing', () => {
    const base = sprintJump().s;
    const l = landStep(base);
    const pick = (t: SimState) => ({ vx: t.player.vx, x: t.player.x, y: t.player.y });
    for (const dir of ['L', '']) {
      const other = sprintJump([...repeat(l - 1, dir), ...repeat(10, 'R')]).s;
      expect(other.slice(0, l).map(pick)).toEqual(base.slice(0, l).map(pick));
    }
  });
});

describe('air-drag check 9: let go mid-air, then land', () => {
  it('lands at |vx| 9, stops 2.54 tiles after the landing step (28th step after), through bands 2 and 1', () => {
    const { s } = sprintJump([...repeat(8, 'R'), ...repeat(140, '')]);
    const l = landStep(s);
    expect(at(s, l).player.vx).toBe(9);
    const after = s.slice(l);
    const stop = firstStep(after, (t) => t.player.vx === 0);
    expect(stop).toBe(28);
    expect(at(after, stop).player.x - at(s, l).player.x).toBeCloseTo(2.54, 2);
    const seq = after.slice(0, stop).reduce<number[]>((a, t) => (a.at(-1) === t.player.band ? a : [...a, t.player.band]), [3]);
    expect(seq).toEqual([3, 2, 1, 0]);
  });
});

describe('air-drag check 10: counter resets on landing', () => {
  it('a buffered jump 3 steps before landing: the second flight drops on its step 40', () => {
    const { s } = sprintJump([...repeat(43, 'R'), frame('RJ'), ...repeat(120, 'R')]);
    const l = landStep(s);
    expect(l).toBe(48);
    const second = s.slice(l);
    expect(second[0]?.events).toContainEqual({ type: 'jump', coyote: false, buffered: true });
    expect(Math.abs(second[0]!.player.vx)).toBe(9);
    expect(dropSteps(second)[0]).toBe(40);
  });
});

describe('air-drag check 11: gear follows band at takeoff', () => {
  it('ramp with + on 1, 3, 5, jump on run step 26 (band 3): gear 3 after launch, <= 3 on landing', () => {
    const ramp = [frame('R+'), frame('R'), frame('R+'), frame('R'), frame('R+'), ...repeat(20, 'R'), frame('RJ'), ...repeat(80, 'R')];
    const s = runFromSpawn(level, ramp);
    expect(at(s, 25).player.band).toBe(3);
    expect(at(s, 26).player).toMatchObject({ gear: 3 });
    expect(eventTypes(at(s, 26))).toContain('jump');
    expect(at(s, 26 - 1 + landStep(s.slice(25))).player.gear).toBeLessThanOrEqual(3);
  });
});

describe('air-drag check 12: downshift kept', () => {
  it('- on action steps 1 and 3, jump on step 4 (band 4, gear 2): gear 2 for the whole flight', () => {
    const s = runFrames(level, cruise(level, 4), [frame('R-'), frame('R'), frame('R-'), frame('RJ'), ...repeat(80, 'R')]);
    // "band 4" is the band going into step 4 (end of step 3, |vx| 10.74);
    // the launch step's ground update brakes to 10.32 (band 3) before takeoff.
    expect(at(s, 3).player).toMatchObject({ band: 4, gear: 2 });
    const flightEnd = 3 + landStep(s.slice(3));
    expect(s.slice(3, flightEnd).every((t) => t.player.gear === 2)).toBe(true);
  });
});

describe('air-drag check 13-14: shifts in the air', () => {
  const standingJump = (pressAt: number): SimState[] =>
    runFrames(level, createSim(level, params), [frame('J'), ...repeat(pressAt - 2, ''), frame('+'), ...repeat(60, '')]);

  it('+ on flight step 10: gear 1 through the flight and after landing', () => {
    const s = standingJump(10);
    expect(eventTypes(at(s, 10))).toContain('shiftBuffered');
    expect(s.every((t) => t.player.gear === 1)).toBe(true);
  });

  it('+ on L-4 gives gear 2 at the end of L; on L-10 gear 1 after landing', () => {
    const l = landStep(standingJump(30));
    expect(l).toBe(48);
    expect(at(standingJump(l - 4), l).player.gear).toBe(2);
    expect(at(standingJump(l - 4), l).events).toContainEqual({ type: 'shift', from: 1, to: 2 });
    expect(at(standingJump(l - 10), l).player.gear).toBe(1);
  });
});

describe('air-drag check 15: wall in the air', () => {
  it('gear 4 jump at a safe wall 3 tiles away: vx 0 and gear 1 on contact, no drop after, falls straight down', () => {
    const start = cruise(level, 4);
    const face = Math.ceil(start.player.x + params.playerWidth / 2 + 3);
    const walled = room(400, 2, Array.from({ length: 10 }, (_, r) => ({ row: r, col: face, chars: '#' })));
    const s = runFrames(walled, start, [frame('RJ'), ...repeat(80, 'R')]);
    const contact = firstStep(s, has('wallStop'));
    expect(at(s, contact).player.grounded).toBe(false);
    expect(at(s, contact).player).toMatchObject({ vx: 0, gear: 1 });
    const rest = s.slice(contact);
    expect(rest.some(has('airDrag'))).toBe(false);
    expect(rest.every((t) => t.player.x === at(s, contact).player.x)).toBe(true);
  });
});
