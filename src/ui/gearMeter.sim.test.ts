/**
 * docs/design/features/hud-gear-meter.md checks 1-10 driven through the real
 * sim: the pure model reads each state the sim produces. Flight step k is the
 * k-th state after the launch input.
 */
import { describe, expect, it } from 'vitest';
import type { SimState } from '../core';
import { gearMeterModel, INITIAL_GEAR_METER_MODEL as INITIAL, type GearMeterModel } from './gearMeter';
import { at, cruise, firstStep, flatRoom, frame, hasEvent, repeat, runFrames, SIM_PARAMS, spawn } from './testkit';

const room = flatRoom();
const model = (s: SimState): GearMeterModel => gearMeterModel(s.player, SIM_PARAMS);
const models = (states: readonly SimState[]): GearMeterModel[] => states.map(model);
const landStep = (states: readonly SimState[]): number => firstStep(states, hasEvent('land'));

describe('check 1: initial state', () => {
  it('white lit, gear 1, needle 0, nothing else', () => {
    expect(model(spawn(room))).toEqual(INITIAL);
  });
});

describe('check 2: standing, three up-presses', () => {
  it('bracket on gear 4, still white, needle at 0', () => {
    const s = runFrames(room, spawn(room), [frame('+'), frame(''), frame('+'), frame(''), frame('+')]);
    expect(models(s).map((m) => m.selectedGear)).toEqual([2, 2, 3, 3, 4]);
    expect(models(s).every((m) => m.litBand === 0 && m.needle === 0)).toBe(true);
  });
});

describe('check 3: gear 4, hold Right from rest', () => {
  const ramp = [frame('R+'), frame('R'), frame('R+'), frame('R'), frame('R+'), ...repeat(115, 'R')];
  const s = runFrames(room, spawn(room), ramp);
  const m = models(s);
  const litAt = (band: number): number => firstStep(s, (t) => t.player.band === band);

  it('lit band equals the sim band on every step (2 on step 10, 3 on step 23, 4 on step 32)', () => {
    expect(m.every((x, i) => x.litBand === at(s, i + 1).player.band)).toBe(true);
    expect(m.findIndex((x) => x.litBand === 2) + 1).toBe(10);
    expect(m.findIndex((x) => x.litBand === 3) + 1).toBe(23);
    expect(m.findIndex((x) => x.litBand === 4) + 1).toBe(32);
    expect(litAt(4)).toBe(32);
  });

  it('needle never decreases and is exactly 4 from step 36', () => {
    expect(m.every((x, i) => i === 0 || x.needle >= (m[i - 1]?.needle ?? 0))).toBe(true);
    expect(m.slice(0, 35).every((x) => x.needle < 4)).toBe(true);
    expect(m.slice(35).every((x) => x.needle === 4)).toBe(true);
  });

  it('the bracket is on gear 4 from the third press on', () => {
    expect(m.slice(4).every((x) => x.selectedGear === 4)).toBe(true);
  });
});

describe('check 4: let go at full sprint', () => {
  const s = runFrames(room, cruise(room, 4), repeat(80, ''));
  const m = models(s);

  it('needle falls to 0 and stays there; it never rises on the way down', () => {
    expect(m[m.length - 1]?.needle).toBe(0);
    expect(m.every((x, i) => i === 0 || x.needle <= (m[i - 1]?.needle ?? 4))).toBe(true);
    expect(m.some((x) => x.needle > 0 && x.needle < 4)).toBe(true);
  });

  it('the bracket stays on gear 4 throughout', () => {
    expect(m.every((x) => x.selectedGear === 4)).toBe(true);
  });
});

describe('check 5: gear-4 flat jump', () => {
  const s = runFrames(room, cruise(room, 4), [frame('RJ'), ...repeat(80, 'R')]);
  const m = models(s);
  const land = landStep(s);
  const fill = (k: number): number | null => m[k - 1]?.dragFill ?? null;

  it('lands on flight step 48', () => {
    expect(land).toBe(48);
  });

  it('is shown from the takeoff step and rises until the drop', () => {
    for (let k = 1; k <= 29; k += 1) expect(fill(k)).not.toBeNull();
    for (let k = 2; k <= 29; k += 1) expect(fill(k)).toBeGreaterThan(fill(k - 1) ?? 0);
    expect(fill(29)).toBeGreaterThan(0.9);
  });

  it('wraps to the carried remainder on the drop step (flight step 30) and lights yellow', () => {
    expect(fill(30)).toBeLessThan(0.2);
    expect(fill(30)).toBeGreaterThanOrEqual(0);
    expect(m[29]?.litBand).toBe(3);
    expect(m[28]?.litBand).toBe(4);
  });

  it('keeps rising while yellow', () => {
    for (let k = 31; k < land; k += 1) expect(fill(k)).toBeGreaterThan(fill(k - 1) ?? 0);
  });

  it('is hidden on the landing step', () => {
    expect(fill(land)).toBeNull();
    expect(m[land - 1]?.airborne).toBe(false);
  });
});

describe('check 6: no drag meter at blue or white', () => {
  it('gear-1 walking jump', () => {
    const s = runFrames(room, cruise(room, 1), [frame('RJ'), ...repeat(60, 'R')]);
    expect(models(s).every((x) => x.dragFill === null)).toBe(true);
  });

  it('standing jump', () => {
    const s = runFrames(room, spawn(room), [frame('J'), ...repeat(60, '')]);
    expect(models(s).some((x) => x.airborne)).toBe(true);
    expect(models(s).every((x) => x.dragFill === null)).toBe(true);
  });

  it('a long gear-1 fall off a ledge, even though airDistance keeps growing', () => {
    const ledge = flatRoom(400, 8);
    const s = runFrames(ledge, cruise(ledge, 1), repeat(200, 'R'));
    const air = s.filter((t) => !t.player.grounded);
    expect(air.length).toBeGreaterThan(20);
    expect(air.some((t) => t.player.airDistance > 0)).toBe(true);
    expect(air.every((t) => model(t).dragFill === null)).toBe(true);
  });
});

describe('check 7: pending shift in a gear-1 walking jump', () => {
  const press = (flightStep: number) =>
    runFrames(room, cruise(room, 1), [
      frame('RJ'),
      ...repeat(flightStep - 2, 'R'),
      frame('R+'),
      ...repeat(60, 'R'),
    ]);

  it('up-press on flight step 10: pending 2 from the press, null once the buffer runs out, gear unchanged', () => {
    const s = press(10);
    const m = models(s);
    expect(landStep(s)).toBe(48);
    expect(m.slice(0, 9).every((x) => x.pendingGear === null)).toBe(true);
    expect(m[9]?.pendingGear).toBe(2);
    const expiry = m.findIndex((x, i) => i >= 9 && x.pendingGear === null) + 1;
    expect(expiry).toBeGreaterThan(10);
    expect(expiry - 10).toBeLessThanOrEqual(6);
    expect(at(s, expiry).player.shiftBufferSteps).toBe(0);
    for (let k = 10; k < expiry; k += 1) expect(at(s, k).player.shiftBufferSteps).toBeGreaterThan(0);
    expect(m.slice(expiry - 1).every((x) => x.pendingGear === null)).toBe(true);
    expect(m.every((x) => x.selectedGear === 1)).toBe(true);
  });

  it('up-press 3 steps before landing: pending until landing, then the bracket shows the applied gear', () => {
    const s = press(45);
    const m = models(s);
    expect(landStep(s)).toBe(48);
    for (let k = 45; k < 48; k += 1) expect(m[k - 1]).toMatchObject({ pendingGear: 2, selectedGear: 1 });
    expect(m[47]).toMatchObject({ pendingGear: null, selectedGear: 2, airborne: false });
  });
});

describe('check 8: up-press in the air at gear 4', () => {
  it('shows no pending bracket: it cannot change the gear', () => {
    const s = runFrames(room, cruise(room, 4), [frame('RJ'), ...repeat(3, 'R'), frame('R+'), ...repeat(20, 'R')]);
    expect(at(s, 5).player.shiftBufferSteps).toBeGreaterThan(0);
    expect(models(s).slice(0, 25).every((x) => x.pendingGear === null)).toBe(true);
  });
});

describe('check 9: after death or R', () => {
  it('restart: back to the initial model', () => {
    const s = runFrames(room, cruise(room, 4), [frame('R'), frame('R!'), frame('R'), ...repeat(5, '')]);
    expect(model(at(s, 1))).toMatchObject({ selectedGear: 4, litBand: 4 });
    expect(model(at(s, s.length))).toEqual(INITIAL);
  });

  it('death: the freeze shows the last state, the respawn shows the initial model', () => {
    const pit = flatRoom(400, 10);
    const s = runFrames(pit, cruise(pit, 4), repeat(400, 'R'));
    const died = firstStep(s, hasEvent('died'));
    expect(died).toBeGreaterThan(0);
    expect(model(at(s, died)).selectedGear).toBe(4);
    const respawn = s.findIndex((t, i) => i >= died && t.status === 'playing') + 1;
    expect(respawn).toBeGreaterThan(died);
    expect(model(at(s, respawn))).toEqual(INITIAL);
  });
});
