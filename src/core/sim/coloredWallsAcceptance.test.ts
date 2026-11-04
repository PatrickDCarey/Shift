/**
 * docs/design/features/colored-walls.md acceptance checks 1-7 through the real
 * `step`. Walls are 1 tile wide, full height on safe floor unless stated;
 * "launch x" is aligned to the grid (an integer, or a half tile for the
 * ceiling check) by moving the cruising state sideways, which changes nothing
 * in the rules because every tile edge is an integer.
 */
import { describe, expect, it } from 'vitest';
import type { Gear, Level, SimState } from '../types';
import { at, block, cruise, eventTypes, firstStep, frame, params, repeat, room, runFrames, type Placement } from './testkit';

const W = 240;
const HALF = params.playerWidth / 2;
const FLOOR = 10;
/** Launch column for the in-flight checks: the box stands on safe floor around it. */
const LAUNCH_X = 20;
const has = (type: string) => (s: SimState): boolean => eventTypes(s).includes(type);
const landStep = (s: readonly SimState[]): number => firstStep(s, has('land'));
const bandStep = (s: readonly SimState[], band: number): number => firstStep(s, (t) => t.player.band === band);

/** Cruising state at `gear`, moved sideways to `x`. */
function cruiseAt(lvl: Level, gear: Gear, x: number): SimState {
  const s = cruise(lvl, gear);
  return { ...s, player: { ...s.player, x } };
}

/** A solid column of `color` from the floor to the top row (rows 0-9) at `col`. */
const column = (col: number, color: string): Placement[] => block([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], col, color);

/**
 * Flat jump set-up: safe floor up to and including column `LAUNCH_X`, a pit
 * after it, a wall of `color` at `LAUNCH_X + face` spanning heights -2..+5
 * (rows 5-11), and safe floor again past the wall for the landing.
 */
function flightRoom(face: number, color: string): Level {
  const wallCol = LAUNCH_X + face;
  const floorRow = '#'.repeat(LAUNCH_X + 1) + '.'.repeat(face) + '#'.repeat(W - wallCol - 1);
  const rows = [FLOOR, FLOOR + 1].map((row) => ({ row, col: 0, chars: floorRow }));
  return room(W, 2, [...rows, ...block([5, 6, 7, 8, 9, 10, 11], wallCol, color)], '.');
}

/** Gear-4 flat jump at the flight room, holding R. */
function sprintJump(face: number, color: string, steps = 80): SimState[] {
  const lvl = flightRoom(face, color);
  return runFrames(lvl, cruiseAt(lvl, 4, LAUNCH_X), [frame('RJ'), ...repeat(steps, 'R')]);
}

const wallRoom = (color: string, col = 60): Level => room(W, 2, column(col, color));

function check1(): { s: SimState[]; stop: number } {
  const lvl = wallRoom('R');
  const s = runFrames(lvl, cruise(lvl, 4), repeat(300, 'R'));
  return { s, stop: firstStep(s, has('wallStop')) };
}

/** Gear 3 toward a red wall at col 60; `+` on the first step the front edge is within 0.20 of the face. */
function check2(): SimState[] {
  const lvl = wallRoom('R');
  const pre = runFrames(lvl, cruise(lvl, 3), repeat(2000, 'R'));
  const n = pre.findIndex((t) => 60 - (t.player.x + HALF) <= 0.2);
  return runFrames(lvl, pre[n]!, [frame('R+'), ...repeat(60, 'R')]);
}

/** Jump under a green row at `row` spanning columns 21-23 (0.5 to 3.5 past the launch x of 20.5). */
function ceilingJump(gear: Gear, row: number): SimState[] {
  const lvl = room(W, 2, [{ row, col: 21, chars: 'GGG' }]);
  return runFrames(lvl, cruiseAt(lvl, gear, 20.5), [frame('RJ'), ...repeat(60, 'R')]);
}

describe('colored walls check 1: wall brake keeps the gear', () => {
  const { s, stop } = check1();
  const stopX = at(s, stop).player.x;

  it('contact step: vx 0, gear 4, band 0, flush against the face', () => {
    expect(at(s, stop).player).toMatchObject({ vx: 0, gear: 4, band: 0 });
    expect(stopX + HALF).toBe(60);
  });

  it('holding R: vx 3 at the end of the next step, box overlapping the wall in band 1', () => {
    const next = at(s, stop + 1).player;
    expect(next).toMatchObject({ vx: 3, band: 1, gear: 4 });
    expect(next.x + HALF).toBeGreaterThan(60);
  });

  it('band 4 is first reached 3.23 tiles past the stop x', () => {
    const b4 = at(s, firstStep(s.slice(stop), (t) => t.player.band === 4) + stop);
    expect(b4.player.x - stopX).toBeCloseTo(3.23, 2);
  });
});

describe('colored walls check 2: shift up inside a wall', () => {
  const s = check2();
  const overlap = firstStep(s, (t) => t.player.x + HALF > 60);

  it('the box first overlaps the wall in band 3; band 4 on action step 4; vx never 0', () => {
    expect(at(s, overlap).player.band).toBe(3);
    expect(bandStep(s, 4)).toBe(4);
    expect(s.every((t) => t.player.vx !== 0)).toBe(true);
    expect(s.some(has('wallStop'))).toBe(false);
  });

  it('exits the far side in band 4', () => {
    const out = s.find((t) => t.player.x - HALF >= 61);
    expect(out?.player.band).toBe(4);
  });
});

describe('colored walls check 3: red in flight, then yellow', () => {
  const s = sprintJump(4, 'R');

  it('wall stop on flight step 19 with band 4 at the start of the step', () => {
    expect(firstStep(s, has('wallStop'))).toBe(19);
    expect(at(s, 18).player).toMatchObject({ band: 4, vx: 12 });
  });

  it('vx 0, then gear 1; no drag drop afterwards', () => {
    expect(at(s, 19).player).toMatchObject({ vx: 0, gear: 1, grounded: false });
    expect(s.some(has('airDrag'))).toBe(false);
    expect(s.slice(18).every((t) => t.player.vx === 0 && t.player.gear === 1)).toBe(true);
  });
});

describe('colored walls check 4: drag lets you through', () => {
  const s = sprintJump(7, 'R');
  const l = landStep(s);

  it('drop to |vx| 9 on flight step 30; the box first overlaps the wall on flight step 35 in band 3', () => {
    expect(at(s, 30).events).toContainEqual(expect.objectContaining({ type: 'airDrag' }));
    expect(at(s, 30).player.vx).toBe(9);
    expect(firstStep(s, (t) => t.player.x + HALF > LAUNCH_X + 7)).toBe(35);
    expect(at(s, 35).player.band).toBe(3);
  });

  it('passes the wall: vx never 0 in flight, no wall stop, lands past it', () => {
    expect(l).toBeGreaterThan(35);
    expect(s.slice(0, l).every((t) => t.player.vx !== 0)).toBe(true);
    expect(s.some(has('wallStop'))).toBe(false);
    expect(at(s, l).player.x - HALF).toBeGreaterThan(LAUNCH_X + 8);
  });
});

describe('colored walls check 5: drag stops you', () => {
  const s = sprintJump(7, 'Y');

  it('yellow wall at 7.0: wall stop on flight step 35 (band 3 at its start), then gear 1', () => {
    expect(firstStep(s, has('wallStop'))).toBe(35);
    expect(at(s, 34).player.band).toBe(3);
    expect(at(s, 35).player).toMatchObject({ vx: 0, gear: 1 });
  });
});

describe('colored walls check 6: colored ceiling', () => {
  /*
   * The spec puts the ceiling bottom 3.5 tiles above the floor, which a tile
   * grid cannot do (requests.md 2026-11-04, to design-lead). The contact step
   * is asserted for the two neighbouring integer heights instead: 3 above
   * (row 6) and 4 above (row 5). The spec's step 11 sits between them.
   */
  it.each([
    { row: 6, bottom: 3, contact: 8 },
    { row: 5, bottom: 4, contact: 15 },
  ])('gear 2 under green tiles $bottom above the floor: contact on flight step $contact, vy >= 0, vx 6', ({ row, contact }) => {
    const s = ceilingJump(2, row);
    expect(firstStep(s, has('ceiling'))).toBe(contact);
    expect(s.slice(contact - 1, contact + 15).every((t) => t.player.vy >= 0)).toBe(true);
    expect(at(s, contact).player.vx).toBe(6);
    expect(s.slice(0, landStep(s)).every((t) => t.player.vx === 6)).toBe(true);
  });

  it.each([6, 5])('gear 3 under the same row %i: no contact, apex 3.0 on flight step 24, lands 6.8 out in band 2', (row) => {
    const s = ceilingJump(3, row);
    expect(s.some(has('ceiling'))).toBe(false);
    const apex = Math.min(...s.map((t) => t.player.y));
    expect(FLOOR - apex).toBeCloseTo(3, 9);
    expect(s.findIndex((t) => t.player.y === apex) + 1).toBe(24);
    const l = landStep(s);
    expect(at(s, l).player.x - 20.5).toBeCloseTo(6.8, 2);
    expect(at(s, l).player.band).toBe(2);
  });
});

describe('colored walls check 7: determinism', () => {
  it('checks 1-6 run twice give identical step-by-step state', () => {
    const runs: ReadonlyArray<() => readonly SimState[]> = [
      () => check1().s,
      check2,
      () => sprintJump(4, 'R'),
      () => sprintJump(7, 'R'),
      () => sprintJump(7, 'Y'),
      () => ceilingJump(2, 6),
      () => ceilingJump(3, 5),
    ];
    runs.forEach((run) => expect(run()).toEqual(run()));
  });
});
