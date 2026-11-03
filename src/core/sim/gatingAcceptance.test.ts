/**
 * docs/design/features/color-gating.md acceptance checks 1-16 through the
 * real `step`. A pit = no tiles below the floor row down to the grid bottom.
 */
import { describe, expect, it } from 'vitest';
import type { Gear, Level, SimState } from '../types';
import { createSim } from './create';
import { advance, at, cruise, eventTypes, firstStep, frame, params, repeat, room, runFrames, type Placement } from './testkit';

const W = 240;
const HALF = params.playerWidth / 2;
/** Floor row 10 = `floor` (rest of the row pit), nothing below: everything over a pit. */
const floorLevel = (floor: string, places: readonly Placement[] = []): Level =>
  room(W, 2, [{ row: 10, col: 0, chars: floor }, ...places], '.');
const has = (type: string) => (s: SimState): boolean => eventTypes(s).includes(type);
const grounded = (s: SimState): boolean => s.player.grounded;

/** Cruise at `gear` holding R, then keep holding until the box is a full tile past `col`, plus 10 steps. */
function cruiseOnto(lvl: Level, gear: Gear, col: number): SimState {
  const start = cruise(lvl, gear);
  const states = runFrames(lvl, start, repeat(2000, 'R'));
  const n = states.findIndex((s) => s.player.x - HALF >= col + 1);
  return advance(lvl, states[n]!, repeat(10, 'R'));
}

const green = floorLevel('#'.repeat(20) + 'G'.repeat(W - 20));
const blue = floorLevel('#'.repeat(20) + 'B'.repeat(W - 20));
const bandStep = (s: readonly SimState[], band: number): number => firstStep(s, (t) => t.player.band === band);

function expectGraceWindow(s: readonly SimState[], c: number): void {
  for (let k = 1; k <= 6; k += 1) expect(at(s, c + k).player.grounded).toBe(true);
  expect(at(s, c + 7).player.grounded).toBe(false);
  expect(at(s, c).events).toContainEqual(expect.objectContaining({ type: 'graceStart' }));
}

describe('gating check 1: match holds', () => {
  it('gear 1 across a 20-tile blue row over a pit: grounded on every step', () => {
    const lvl = floorLevel('#'.repeat(12) + 'B'.repeat(20) + '#'.repeat(30));
    const s = runFrames(lvl, cruise(lvl, 1, 'R', 10), repeat(700, 'R'));
    const crossing = s.filter((t) => t.player.x < 40);
    expect(s.some((t) => t.player.x - HALF > 32)).toBe(true);
    expect(crossing.every(grounded)).toBe(true);
  });
});

describe('gating check 2: mismatch is a hole', () => {
  it('gear 2 from safe onto blue: airborne on the first step no safe tile supports the box; never grounded on blue', () => {
    const lvl = floorLevel('#'.repeat(20) + 'B'.repeat(20));
    const s = runFrames(lvl, cruise(lvl, 2), repeat(300, 'R'));
    const unsupported = firstStep(s, (t) => t.player.x - HALF >= 20);
    expect(at(s, unsupported).player.grounded).toBe(false);
    expect(at(s, unsupported - 1).player.grounded).toBe(true);
    expect(s.some((t) => t.player.grounded && t.player.x - HALF >= 20)).toBe(false);
  });
});

describe('gating check 3: no grace on landing', () => {
  it('a gear-4 flat jump (lands yellow) aimed at a green pad passes through it', () => {
    const lvl = floorLevel('#'.repeat(14) + '.'.repeat(5) + 'G'.repeat(8));
    const start = cruise(lvl, 4);
    const s = runFrames(lvl, start, [frame('RJ'), ...repeat(100, 'R')]);
    const atPadHeight = s.find((t) => t.player.y >= 10 && t.player.vy > 0 && t.player.x > 19);
    expect(atPadHeight?.player.band).toBe(3);
    expect(atPadHeight!.player.x).toBeLessThan(27);
    expect(s.some((t) => t.player.grounded && t.player.x > 19)).toBe(false);
    expect(s.some(has('died'))).toBe(true);
  });
});

describe('gating check 4-5: grace windows on green', () => {
  it('shift: band 3 on action step c = 5; grounded c+1..c+6, airborne c+7', () => {
    const s = runFrames(green, cruiseOnto(green, 2, 20), [frame('R+'), ...repeat(40, 'R')]);
    const c = bandStep(s, 3);
    expect(c).toBe(5);
    expectGraceWindow(s, c);
  });

  it('let go: band 1 on action step 9 (= c); grounded c+1..c+6, airborne c+7', () => {
    const s = runFrames(green, cruiseOnto(green, 2, 20), repeat(40, ''));
    const c = bandStep(s, 1);
    expect(c).toBe(9);
    expectGraceWindow(s, c);
  });
});

describe('gating check 6-7: walking on blue', () => {
  it('release: band 0 on action step 1 (= c); grounded c+1..c+6, airborne c+7', () => {
    const s = runFrames(blue, cruiseOnto(blue, 1, 20), repeat(20, ''));
    expect(bandStep(s, 0)).toBe(1);
    expectGraceWindow(s, 1);
  });

  it('turn: band stays 1 on every step; never airborne', () => {
    const s = runFrames(blue, cruiseOnto(blue, 1, 20), repeat(60, 'L'));
    expect(s.every((t) => t.player.band === 1 && t.player.grounded)).toBe(true);
  });
});

describe('gating check 8: grace plus coyote', () => {
  const start = cruiseOnto(green, 2, 20);
  const pressJ = (step: number): SimState[] =>
    runFrames(green, start, [frame('R+'), ...repeat(step - 2, 'R'), frame('RJ'), ...repeat(20, 'R')]);
  const c = bandStep(runFrames(green, start, [frame('R+'), ...repeat(20, 'R')]), 3);

  it('J on c+11 launches', () => {
    expect(at(pressJ(c + 11), c + 11).events).toContainEqual({ type: 'jump', coyote: true, buffered: false });
  });

  it('J on c+14 (no earlier press) does not', () => {
    expect(pressJ(c + 14).some(has('jump'))).toBe(false);
  });

  it('the whole window is c+1..c+12 (c+12 last, c+13 too late)', () => {
    expect(at(pressJ(c + 12), c + 12).events.some((e) => e.type === 'jump')).toBe(true);
    expect(pressJ(c + 13).some(has('jump'))).toBe(false);
  });
});

describe('gating check 9: jump in grace onto yellow', () => {
  it('J on c+3 lands on a yellow ledge (top 2 above, 4..14 tiles ahead) in band 3', () => {
    const start = cruiseOnto(green, 2, 20);
    const ledgeCol = Math.floor(start.player.x) + 4;
    const lvl = floorLevel('#'.repeat(20) + 'G'.repeat(W - 20), [{ row: 8, col: ledgeCol, chars: 'Y'.repeat(10) }]);
    const s = runFrames(lvl, start, [frame('R+'), ...repeat(6, 'R'), frame('RJ'), ...repeat(80, 'R')]);
    const c = bandStep(s, 3);
    expect(c).toBe(5);
    const landing = at(s, firstStep(s, has('land')));
    expect(firstStep(s, has('jump'))).toBe(8);
    expect(landing.player).toMatchObject({ y: 8, band: 3 });
  });
});

describe('gating check 10: grace ends on takeoff', () => {
  it('band 1 on action step 9 (= c), jump on c+1: comes down in band 1 onto green and passes through', () => {
    const s = runFrames(green, cruiseOnto(green, 2, 20), [frame('R-'), ...repeat(8, 'R'), frame('RJ'), ...repeat(80, 'R')]);
    expect(bandStep(s, 1)).toBe(9);
    expect(eventTypes(at(s, 10))).toContain('jump');
    expect(at(s, 10).player.graceSteps).toBe(0);
    const down = s.slice(10).find((t) => t.player.y > 10);
    expect(down?.player.band).toBe(1);
    expect(s.slice(10).some(has('land'))).toBe(false);
  });
});

describe('gating check 11: walls do not get grace', () => {
  it('gear 2 toward a 1-thick green wall, band 3 about 2 tiles before it: passes through', () => {
    const wallCol = 60;
    const lvl = room(W, 2, [7, 8, 9].map((r) => ({ row: r, col: wallCol, chars: 'G' })));
    const pre = runFrames(lvl, cruise(lvl, 2), repeat(2000, 'R'));
    const n = pre.findIndex((t) => t.player.x + HALF >= wallCol - 2.6);
    const s = runFrames(lvl, pre[n]!, [frame('R+'), ...repeat(80, 'R')]);
    const c = bandStep(s, 3);
    expect(wallCol - (at(s, c).player.x + HALF)).toBeCloseTo(2, 0);
    expect(s.every((t) => t.player.vx !== 0)).toBe(true);
    expect(s.at(-1)!.player.x - HALF).toBeGreaterThan(wallCol + 1);
  });
});

describe('gating check 12: matching wall stops', () => {
  const wallCol = 60;
  const lvl = room(W, 2, [7, 8, 9].map((r) => ({ row: r, col: wallCol, chars: 'R' })));
  it('gear 4 into a red wall: vx 0, gear 4, band 0', () => {
    const s = runFrames(lvl, cruise(lvl, 4), repeat(400, 'R'));
    const stop = at(s, firstStep(s, has('wallStop')));
    expect(stop.player).toMatchObject({ vx: 0, gear: 4, band: 0 });
    expect(stop.player.x + HALF).toBe(wallCol);
  });

  it('gear 3 into the same wall: passes through', () => {
    const s = runFrames(lvl, cruise(lvl, 3), repeat(600, 'R'));
    expect(s.some(has('wallStop'))).toBe(false);
    expect(s.at(-1)!.player.x).toBeGreaterThan(wallCol + 2);
  });
});

describe('gating check 13: no-embed', () => {
  it('+ on the first step inside a 3-thick yellow wall: band 3 inside, vx never 0, exits in band 3', () => {
    const wallCol = 60;
    const lvl = room(W, 2, [7, 8, 9].map((r) => ({ row: r, col: wallCol, chars: 'YYY' })));
    const pre = runFrames(lvl, cruise(lvl, 2), repeat(2000, 'R'));
    const n = pre.findIndex((t) => t.player.x + HALF > wallCol);
    const s = runFrames(lvl, pre[n]!, [frame('R+'), ...repeat(60, 'R')]);
    const c = bandStep(s, 3);
    expect(at(s, c).player.x - HALF).toBeLessThan(wallCol + 3);
    expect(s.every((t) => t.player.vx !== 0)).toBe(true);
    const out = s.find((t) => t.player.x - HALF >= wallCol + 3);
    expect(out?.player.band).toBe(3);
  });
});

describe('gating check 14: ceilings', () => {
  it('standing (band 0) under a blue tile: the jump passes through it', () => {
    const lvl = room(W, 2, [{ row: 6, col: 2, chars: 'B' }]);
    const s = runFrames(lvl, createSim(lvl, params), [frame('J'), ...repeat(60, '')]);
    expect(s.some(has('ceiling'))).toBe(false);
    expect(Math.min(...s.map((t) => t.player.y))).toBeCloseTo(7, 9);
  });

  it('gear 1 under a row of blue ceiling tiles: vy >= 0 on contact, vx unchanged', () => {
    const lvl = room(W, 2, [{ row: 6, col: 0, chars: 'B'.repeat(W) }]);
    const s = runFrames(lvl, cruise(lvl, 1, 'R', 10), [frame('RJ'), ...repeat(60, 'R')]);
    const hit = at(s, firstStep(s, has('ceiling')));
    expect(hit.player.vy).toBeGreaterThanOrEqual(0);
    expect(hit.player.vx).toBe(3);
  });
});

describe('gating check 15: straddle', () => {
  it('standing half over safe and half over yellow above a pit: grounded indefinitely', () => {
    const lvl = room(W, 8, [{ row: 10, col: 0, chars: '#'.repeat(10) + 'Y'.repeat(10) }], '.');
    const s = runFrames(lvl, createSim(lvl, params), [...repeat(30, 'R'), ...repeat(300, '')]);
    const { x } = at(s, 30).player;
    expect(Math.min(10 - (x - HALF), x + HALF - 10)).toBeGreaterThan(0.3);
    expect(s.every(grounded)).toBe(true);
  });
});

describe('gating check 16: determinism', () => {
  it('checks 4-10 setups run twice give identical step-by-step state', () => {
    const script = [frame('R+'), ...repeat(10, 'R'), frame('RJ'), ...repeat(40, 'R'), ...repeat(30, '')];
    const once = runFrames(green, cruiseOnto(green, 2, 20), script);
    const twice = runFrames(green, cruiseOnto(green, 2, 20), script);
    expect(twice).toEqual(once);
  });
});
