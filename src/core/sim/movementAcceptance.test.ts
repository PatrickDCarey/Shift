/**
 * docs/design/features/movement-and-gears.md acceptance checks 1-16 through
 * the real `step` (check 17 is an e2e input-module check). Step numbers are
 * asserted exactly, distances to the spec's printed precision (tolerance
 * ±0.15) unless a comment says the value is pinned.
 */
import { describe, expect, it } from 'vitest';
import { bandForSpeed } from '../motion';
import type { Gear, SimState } from '../types';
import { createSim } from './create';
import { at, block, cruise, firstStep, frame, params, repeat, room, runFrames, runFromSpawn } from './testkit';

const level = room(240, 2);
const mirror = room(240, 237);
const x0 = createSim(level, params).player.x;
const bandAt = (states: readonly SimState[], band: number): number => firstStep(states, (s) => s.player.band === band);
const ramp = [frame('R+'), frame('R'), frame('R+'), frame('R'), frame('R+'), ...repeat(115, 'R')];
const dist = (states: readonly SimState[], n: number, from: number): number => at(states, n).player.x - from;

describe('movement check 1-2: runway from standing', () => {
  const states = runFromSpawn(level, ramp);

  it('vx = 3 exactly at the end of step 1 (band 1)', () => {
    expect(at(states, 1).player).toMatchObject({ vx: 3, band: 1 });
  });

  it('band 2 on step 10, band 3 on step 23, band 4 on step 32 (3.23 tiles)', () => {
    expect(bandAt(states, 2)).toBe(10);
    expect(bandAt(states, 3)).toBe(23);
    expect(bandAt(states, 4)).toBe(32);
    expect(dist(states, 32, x0)).toBeCloseTo(3.23, 2);
  });

  it('vx = 12 exactly from step 36 (4.00 tiles) and stays 12', () => {
    expect(firstStep(states, (s) => s.player.vx === 12)).toBe(36);
    expect(dist(states, 36, x0)).toBeCloseTo(4.0, 2);
    expect(states.slice(35).every((s) => s.player.vx === 12)).toBe(true);
  });

  it('is never band 4 below 3.0 tiles', () => {
    expect(states.filter((s) => s.player.x - x0 < 3).every((s) => s.player.band < 4)).toBe(true);
  });

  it('check 2: |vx| never exceeds gearSpeeds[gear]', () => {
    expect(states.every((s) => Math.abs(s.player.vx) <= params.gearSpeeds[s.player.gear])).toBe(true);
  });
});

describe('movement check 3: walking is instant', () => {
  it('start, stop, start left, turn: each on action step 1', () => {
    const s = runFromSpawn(level, [frame('R'), frame(''), frame('L'), ...repeat(5, 'R'), frame('L')]);
    expect([1, 2, 3].map((n) => at(s, n).player.vx)).toEqual([3, 0, -3]);
    expect(at(s, 8).player.vx).toBe(3);
    expect(at(s, 9).player.vx).toBe(-3);
  });
});

describe('movement check 4: one gear up from cruising at gear 3', () => {
  const start = cruise(level, 3);
  const s = runFrames(level, start, [frame('R+'), ...repeat(20, 'R')]);
  it('band 4 on action step 4 (0.66), vx = 12 on step 8 (1.42)', () => {
    expect(bandAt(s, 4)).toBe(4);
    expect(dist(s, 4, start.player.x)).toBeCloseTo(0.66, 2);
    expect(firstStep(s, (t) => t.player.vx === 12)).toBe(8);
    expect(dist(s, 8, start.player.x)).toBeCloseTo(1.42, 2);
  });
});

describe('movement check 5-6: let go', () => {
  it('from gear 4: band 3 @4 (0.74), 2 @12 (1.91), 1 @26 (3.24), 0 @35 (3.74); gear stays 4', () => {
    const start = cruise(level, 4);
    const s = runFrames(level, start, repeat(60, ''));
    expect([3, 2, 1].map((b) => bandAt(s, b))).toEqual([4, 12, 26]);
    expect([4, 12, 26].map((n) => Number(dist(s, n, start.player.x).toFixed(2)))).toEqual([0.74, 1.91, 3.24]);
    expect(firstStep(s, (t) => t.player.vx === 0)).toBe(35);
    expect(dist(s, 35, start.player.x)).toBeCloseTo(3.74, 2);
    expect(s.every((t) => t.player.gear === 4)).toBe(true);
  });

  it('from gear 2: band 1 @9 (0.78), vx 0 @18 (1.29)', () => {
    const start = cruise(level, 2);
    const s = runFrames(level, start, repeat(30, ''));
    expect(bandAt(s, 1)).toBe(9);
    expect(dist(s, 9, start.player.x)).toBeCloseTo(0.78, 2);
    expect(firstStep(s, (t) => t.player.vx === 0)).toBe(18);
    expect(dist(s, 18, start.player.x)).toBeCloseTo(1.29, 2);
  });
});

describe('movement check 7: downshift while holding', () => {
  it('band 1 @26 (3.24), vx = 3 from step 34 (3.72) and stays; gear 1', () => {
    const start = cruise(level, 4);
    const s = runFrames(level, start, [frame('R-'), frame('R'), frame('R-'), frame('R'), frame('R-'), ...repeat(60, 'R')]);
    expect(bandAt(s, 1)).toBe(26);
    expect(dist(s, 26, start.player.x)).toBeCloseTo(3.24, 2);
    expect(firstStep(s, (t) => t.player.vx === 3)).toBe(34);
    expect(dist(s, 34, start.player.x)).toBeCloseTo(3.72, 2);
    expect(s.slice(33).every((t) => t.player.vx === 3 && t.player.gear === 1)).toBe(true);
  });
});

describe('movement check 8: gear persists through release', () => {
  it('gear 3 throughout; vx reaches 9 on action step 28 of the new hold, 2.57 tiles later', () => {
    const start = cruise(level, 3);
    const stopped = runFrames(level, start, repeat(60, ''));
    const last = at(stopped, 60);
    expect(last.player.vx).toBe(0);
    const s = runFrames(level, last, repeat(40, 'R'));
    expect([...stopped, ...s].every((t) => t.player.gear === 3)).toBe(true);
    expect(firstStep(s, (t) => t.player.vx === 9)).toBe(28);
    expect(dist(s, 28, last.player.x)).toBeCloseTo(2.57, 2);
  });
});

describe('movement check 9: reversal from sprint', () => {
  const start = cruise(level, 4);
  const s = runFrames(level, start, repeat(80, 'L'));

  it('vx positive and decreasing until the turn on step 35 (3.72 skidded), vx = -3 there', () => {
    const turn = firstStep(s, (t) => t.player.vx < 0);
    expect(turn).toBe(35);
    expect(at(s, 35).player.vx).toBe(-3);
    expect(s.slice(0, 34).every((t, i) => t.player.vx > 0 && t.player.vx < (i === 0 ? 12 : s[i - 1]!.player.vx))).toBe(true);
    expect(Math.max(...s.slice(0, 35).map((t) => t.player.x)) - start.player.x).toBeCloseTo(3.72, 2);
  });

  it('vx = -12 exactly from step 70; net displacement -0.25; gear 4; bands 4,3,2,1,2,3,4', () => {
    expect(firstStep(s, (t) => t.player.vx === -12)).toBe(70);
    expect(dist(s, 70, start.player.x)).toBeCloseTo(-0.25, 2);
    expect(s.every((t) => t.player.gear === 4)).toBe(true);
    const seq = s.reduce<number[]>((acc, t) => (acc.at(-1) === t.player.band ? acc : [...acc, t.player.band]), [4]);
    expect(seq).toEqual([4, 3, 2, 1, 2, 3, 4]);
  });
});

describe('movement check 10: both directions', () => {
  it('pressing L over held R turns; releasing L turns back; both from standing stays 0', () => {
    const s = runFrames(level, cruise(level, 1), [frame('LR'), frame('R')]);
    expect(at(s, 1).player.vx).toBe(-3);
    expect(at(s, 2).player.vx).toBe(3);
    const both = runFromSpawn(level, repeat(30, 'LR'));
    expect(both.every((t) => t.player.vx === 0)).toBe(true);
  });
});

describe('movement check 11-12: clamping and shifting while standing', () => {
  it('- at spawn keeps gear 1; + five times (odd steps) gives gear 4', () => {
    expect(at(runFromSpawn(level, [frame('-')]), 1).player.gear).toBe(1);
    const fives = [...Array(10).keys()].map((i) => frame(i % 2 === 0 ? '+' : ''));
    expect(at(runFromSpawn(level, fives), 10).player.gear).toBe(4);
  });

  it('+ twice then nothing for 60 steps: gear 3, vx 0, x unchanged', () => {
    const s = runFromSpawn(level, [frame('+'), frame(''), frame('+'), ...repeat(60, '')]);
    expect(at(s, 63).player).toMatchObject({ gear: 3, vx: 0, x: x0 });
  });
});

describe('movement check 13: mirror', () => {
  it('check 1 with L: same band steps, mirrored distances', () => {
    const right = runFromSpawn(level, ramp);
    const mx0 = createSim(mirror, params).player.x;
    const left = runFromSpawn(mirror, ramp.map((f) => ({ ...f, left: f.right, right: false })));
    left.forEach((t, i) => {
      expect(t.player.band).toBe(right[i]!.player.band);
      expect(t.player.vx).toBe(-right[i]!.player.vx);
      expect(t.player.x - mx0).toBeCloseTo(-(right[i]!.player.x - x0), 9);
    });
  });
});

describe('movement check 14: wall stop keeps gear', () => {
  const walled = room(240, 2, block([7, 8, 9], 40, '#'));
  const start = cruise(walled, 4);
  const s = runFrames(walled, start, repeat(200, 'R'));
  const contact = firstStep(s, (t) => t.events.some((e) => e.type === 'wallStop'));

  it('contact step: vx 0, gear 4, band 0, box edge on the face', () => {
    const c = at(s, contact).player;
    expect(c).toMatchObject({ vx: 0, gear: 4, band: 0 });
    const right = c.x + params.playerWidth / 2;
    expect(right).toBeLessThanOrEqual(40);
    expect(40 - right).toBeLessThan(0.01);
  });

  it('30 more steps holding R: vx 0 and no overlap; then L: -3 on step 1, -12 by step 36', () => {
    const pushing = s.slice(contact, contact + 30);
    expect(pushing.every((t) => t.player.vx === 0 && t.player.x + params.playerWidth / 2 <= 40)).toBe(true);
    const back = runFrames(walled, at(s, contact + 30), repeat(40, 'L'));
    expect(at(back, 1).player.vx).toBe(-3);
    expect(firstStep(back, (t) => t.player.vx === -12)).toBeLessThanOrEqual(36);
  });
});

describe('movement check 15-16 (units through the sim lane)', () => {
  it('band function', () => {
    const cases: Array<[number, number]> = [[0, 0], [1.49, 0], [1.5, 1], [4.5, 2], [7.49, 2], [7.5, 3], [10.5, 4], [12, 4]];
    for (const [speed, band] of cases) expect(bandForSpeed(speed, params.colorBandEdges)).toBe(band);
  });

  it('gear clamps keep the type range', () => {
    const gears: Gear[] = [1, 2, 3, 4];
    expect(gears.map((g) => params.gearSpeeds[g])).toEqual([3, 6, 9, 12]);
  });
});
