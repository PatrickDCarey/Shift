/**
 * docs/design/features/clarity-fixes.md checks for the pure HUD models:
 * PT-3 (needed-colour cue), PT-4 (drag bar span), PT-5 (bracket arrival).
 */
import { describe, expect, it } from 'vitest';
import type { SimState } from '../core';
import { bracketArrived } from './bracketArrival';
import { dragBarSpan } from './dragBar';
import { gearMeterModel, type GearMeterModel } from './gearMeter';
import { CUE_FRAMES, CUE_PULSE_FRAMES, cueView, startCue, updateCue, type NeededColourCue } from './neededColourCue';
import { airborne, cruise, flatRoom, frame, PARAMS, player, repeat, runFrames, SIM_PARAMS, spawn } from './testkit';

const fallThrough = (band: 1 | 2 | 3 | 4, body = 0): { type: string; body: number; cells: { band: 1 | 2 | 3 | 4 }[] } => ({
  type: 'fallThrough',
  body,
  cells: [{ band }],
});

describe('PT-3 check 3: needed-colour cue', () => {
  it('a fall-through with band 2 reports ring cell 2, pulsing on the first frame', () => {
    const cue = startCue(fallThrough(2));
    expect(cue).toEqual({ band: 2, framesLeft: CUE_FRAMES });
    expect(cueView(cue, false)).toEqual({ ringBand: 2, pulse: true });
  });

  it('shows for exactly 45 frames, then none', () => {
    let cue: NeededColourCue | null = updateCue(null, { event: fallThrough(2) });
    let shown = 0;
    while (cue !== null) {
      shown += 1;
      cue = updateCue(cue);
    }
    expect(shown).toBe(CUE_FRAMES);
    expect(CUE_FRAMES).toBe(45);
  });

  it('the pulse is one short burst, then the ring stays', () => {
    let cue: NeededColourCue | null = startCue(fallThrough(3));
    const pulses: boolean[] = [];
    while (cue !== null) {
      pulses.push(cueView(cue, false)?.pulse === true);
      cue = updateCue(cue);
    }
    expect(pulses.filter(Boolean)).toHaveLength(CUE_PULSE_FRAMES);
    expect(pulses.slice(0, CUE_PULSE_FRAMES).every(Boolean)).toBe(true);
    expect(pulses.slice(CUE_PULSE_FRAMES).some(Boolean)).toBe(false);
  });

  it('reduced motion: no pulse, the ring stays', () => {
    const cue = startCue(fallThrough(2));
    expect(cueView(cue, true)).toEqual({ ringBand: 2, pulse: false });
    expect(cueView(updateCue(cue), true)?.ringBand).toBe(2);
  });

  it('respawn clears it, even on the frame of a new event', () => {
    const cue = startCue(fallThrough(4));
    expect(updateCue(cue, { respawn: true })).toBeNull();
    expect(updateCue(cue, { respawn: true, event: fallThrough(2) })).toBeNull();
  });

  it('a new trigger replaces the current cue (one cue at a time per body)', () => {
    const later = updateCue(updateCue(startCue(fallThrough(2))), { event: fallThrough(4) });
    expect(later).toEqual({ band: 4, framesLeft: CUE_FRAMES });
  });

  it('Tandem: an event for the twin does not ring the runner strip, and the other way round', () => {
    expect(startCue(fallThrough(2, 1), 0)).toBeNull();
    expect(startCue(fallThrough(2, 1), 1)?.band).toBe(2);
    expect(updateCue(null, { event: fallThrough(3, 1), body: 0 })).toBeNull();
  });

  it('a coloured wall stop is a plain band; an event with no band starts nothing', () => {
    expect(startCue({ band: 4 })?.band).toBe(4);
    expect(startCue({ type: 'fallThrough', cells: [] })).toBeNull();
    expect(startCue(null)).toBeNull();
    expect(cueView(null, false)).toBeNull();
  });
});

describe('PT-4 checks 1 and 2: drag bar span', () => {
  const room = flatRoom();
  const models = (states: readonly SimState[]): GearMeterModel[] => states.map((s) => gearMeterModel(s.player, SIM_PARAMS));
  const jump = models(runFrames(room, cruise(room, 4), [frame('RJ'), ...repeat(80, 'R')]));

  it('gear-4 flat jump: the bar spans needle to cell 3 and its fill rises each step', () => {
    for (let k = 1; k <= 29; k += 1) {
      const span = dragBarSpan(jump[k - 1] as GearMeterModel);
      expect(span?.toCell).toBe(3);
      expect(span?.fromCell).toBeGreaterThanOrEqual(3);
      if (k > 1) expect(span?.fill).toBeGreaterThan(dragBarSpan(jump[k - 2] as GearMeterModel)?.fill ?? 0);
    }
  });

  it('after the flight-step-30 drop it spans cell 3 to cell 2 from the carried remainder', () => {
    const span = dragBarSpan(jump[29] as GearMeterModel);
    expect(span?.toCell).toBe(2);
    expect(span?.fromCell).toBeGreaterThanOrEqual(2);
    expect(span?.fill).toBeLessThan(0.2);
  });

  it('is null on the landing step', () => {
    const land = jump.findIndex((m, i) => i > 0 && !m.airborne);
    expect(land).toBeGreaterThan(0);
    expect(dragBarSpan(jump[land] as GearMeterModel)).toBeNull();
  });

  it('blue or white flights: null', () => {
    expect(dragBarSpan(gearMeterModel(airborne({ gear: 1, band: 1, vx: 3 }), PARAMS))).toBeNull();
    expect(dragBarSpan(gearMeterModel(airborne({ band: 0 }), PARAMS))).toBeNull();
  });

  it('a needle already below the target cell never makes a backwards bar', () => {
    expect(dragBarSpan({ dragFill: 0.5, litBand: 3, needle: 1.9 })?.fromCell).toBe(2);
  });
});

describe('PT-5 checks 1 and 2: bracket arrival', () => {
  const m = (over: Parameters<typeof player>[0]): GearMeterModel => gearMeterModel(player(over), PARAMS);

  it('gear 4 grounded: band 3 is not arrived, band 4 is', () => {
    expect(bracketArrived(m({ gear: 4, band: 3, vx: 9, moveDir: 1 }))).toBe(false);
    expect(bracketArrived(m({ gear: 4, band: 4, vx: 12, moveDir: 1 }))).toBe(true);
  });

  it('standing in gear 1 is not arrived; walking in gear 1 is', () => {
    expect(bracketArrived(m({ gear: 1 }))).toBe(false);
    expect(bracketArrived(m({ gear: 1, band: 1, vx: 3, moveDir: 1 }))).toBe(true);
  });

  it('w1-03 mid-ramp (gear 4, band 3): litBand is the sim band, 3', () => {
    expect(m({ gear: 4, band: 3, vx: 9, moveDir: 1 }).litBand).toBe(3);
  });

  it('braking below the bracket is thin again; a wall stop (white) is thin', () => {
    expect(bracketArrived(m({ gear: 4, band: 2, vx: 6 }))).toBe(false);
    expect(bracketArrived(m({ gear: 4, band: 0, vx: 0, moveDir: 1 }))).toBe(false);
  });

  it('through the real sim: gear 4 from rest is arrived exactly from step 32 (band 4)', () => {
    const room = flatRoom();
    const ramp = runFrames(room, spawn(room), [frame('R+'), frame('R'), frame('R+'), frame('R'), frame('R+'), ...repeat(60, 'R')]);
    const arrived = ramp.map((st) => bracketArrived(gearMeterModel(st.player, SIM_PARAMS)));
    expect(arrived.findIndex(Boolean) + 1).toBe(32);
    expect(arrived.slice(31).every(Boolean)).toBe(true);
  });
});
