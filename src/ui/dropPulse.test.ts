import { describe, expect, it } from 'vitest';
import { isDragDrop, updateDropPulse, type DropPulse } from './dropPulse';
import type { GearMeterModel } from './gearMeter';

const model = (over: Partial<GearMeterModel> = {}): GearMeterModel => ({
  litBand: 4,
  selectedGear: 4,
  needle: 4,
  dragFill: 0.9,
  pendingGear: null,
  airborne: true,
  ...over,
});

const OPTS = { reducedMotion: false, durationMs: 120 };
const before = model();
const after = model({ litBand: 3, selectedGear: 3, needle: 3, dragFill: 0.05 });

describe('isDragDrop', () => {
  it('true when the lit band falls exactly one cell in the air above the drag floor', () => {
    expect(isDragDrop(before, after)).toBe(true);
  });

  it('false with no previous model (first frame)', () => {
    expect(isDragDrop(null, after)).toBe(false);
  });

  it('false when the band is unchanged or rises', () => {
    expect(isDragDrop(before, before)).toBe(false);
    expect(isDragDrop(after, before)).toBe(false);
  });

  it('false when the drag meter was hidden (blue to white is not a drop)', () => {
    expect(isDragDrop(model({ litBand: 1, dragFill: null }), model({ litBand: 0, dragFill: null }))).toBe(false);
  });

  it('false for a wall stop in the air (several cells at once)', () => {
    expect(isDragDrop(before, model({ litBand: 0, dragFill: null }))).toBe(false);
  });

  it('false for a landing or a respawn (not airborne after)', () => {
    expect(isDragDrop(before, model({ litBand: 3, dragFill: null, airborne: false }))).toBe(false);
  });
});

describe('updateDropPulse', () => {
  it('starts a pulse on the newly lit band when the drop happens', () => {
    expect(updateDropPulse(null, before, after, 1000, OPTS)).toEqual({ band: 3, untilMs: 1120 });
  });

  it('keeps the pulse until it expires, then clears it', () => {
    const pulse: DropPulse = { band: 3, untilMs: 1120 };
    expect(updateDropPulse(pulse, after, after, 1100, OPTS)).toBe(pulse);
    expect(updateDropPulse(pulse, after, after, 1120, OPTS)).toBeNull();
  });

  it('pulses once: a second frame of the same model does not restart it', () => {
    const pulse = updateDropPulse(null, before, after, 1000, OPTS);
    const next = updateDropPulse(pulse, after, after, 1016, OPTS);
    expect(next).toEqual({ band: 3, untilMs: 1120 });
  });

  it('is cancelled when the pulsing cell stops being the lit one (landing, wall, restart)', () => {
    const pulse: DropPulse = { band: 3, untilMs: 1120 };
    expect(updateDropPulse(pulse, after, model({ litBand: 0, dragFill: null, airborne: false }), 1050, OPTS)).toBeNull();
  });

  it('a second drop replaces the pulse', () => {
    const pulse: DropPulse = { band: 3, untilMs: 1120 };
    const second = model({ litBand: 2, dragFill: 0.1 });
    expect(updateDropPulse(pulse, after, second, 1100, OPTS)).toEqual({ band: 2, untilMs: 1220 });
  });

  it('reduced motion: never pulses (the cell just snaps)', () => {
    expect(updateDropPulse(null, before, after, 1000, { ...OPTS, reducedMotion: true })).toBeNull();
    expect(updateDropPulse({ band: 3, untilMs: 2000 }, after, after, 1000, { ...OPTS, reducedMotion: true })).toBeNull();
  });
});
