import { describe, expect, it } from 'vitest';
import type { Gear, PlayerState } from '../core/types';
import { gearMeterModel, type GearMeterParams } from './gearMeter';

const PARAMS: GearMeterParams = {
  gearSpeeds: [0, 3, 6, 9, 12],
  minGear: 1,
  airDragTilesPerGear: 6,
  airDragMinBand: 1,
};

const player = (over: Partial<PlayerState> = {}): PlayerState => ({
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  gear: 1,
  band: 0,
  facing: 1,
  moveDir: 0,
  dirPriority: 0,
  grounded: true,
  coyoteSteps: 0,
  jumpBufferSteps: 0,
  shiftBufferSteps: 0,
  shiftBufferNet: 0,
  graceSteps: 0,
  graceBand: null,
  airDistance: 0,
  ...over,
});

const airborne = (over: Partial<PlayerState> = {}): PlayerState => player({ grounded: false, ...over });

describe('gearMeterModel: lit band and selected gear', () => {
  it('initial state: white lit, gear 1, needle at 0, nothing else', () => {
    expect(gearMeterModel(player(), PARAMS)).toEqual({
      litBand: 0,
      selectedGear: 1,
      needle: 0,
      dragFill: null,
      pendingGear: null,
    });
  });

  it.each([1, 2, 3, 4] as Gear[])('standing in gear %i: bracket on it, still white, needle 0', (gear) => {
    const m = gearMeterModel(player({ gear }), PARAMS);
    expect(m.selectedGear).toBe(gear);
    expect(m.litBand).toBe(0);
    expect(m.needle).toBe(0);
  });

  it('lit band is the sim band, not the gear (mid-ramp)', () => {
    const m = gearMeterModel(player({ gear: 4, band: 2, vx: 6, moveDir: 1 }), PARAMS);
    expect(m.litBand).toBe(2);
    expect(m.selectedGear).toBe(4);
  });

  it('lit band follows the sim band after a drag drop, with the gear lowered to match', () => {
    const m = gearMeterModel(airborne({ gear: 3, band: 3, vx: 9, airDistance: 0.4 }), PARAMS);
    expect(m.litBand).toBe(3);
    expect(m.selectedGear).toBe(3);
  });

  it('holding into a wall (speed 0): white, bracket unchanged, needle 0', () => {
    const m = gearMeterModel(player({ gear: 4, moveDir: 1 }), PARAMS);
    expect(m.litBand).toBe(0);
    expect(m.selectedGear).toBe(4);
    expect(m.needle).toBe(0);
  });
});

describe('gearMeterModel: needle', () => {
  it.each([
    [0, 0],
    [1.5, 0.5],
    [3, 1],
    [4.5, 1.5],
    [6, 2],
    [9, 3],
    [12, 4],
  ])('speed %f gives needle %f', (vx, needle) => {
    expect(gearMeterModel(player({ vx, gear: 4 }), PARAMS).needle).toBeCloseTo(needle, 9);
  });

  it('uses |vx| for leftward motion', () => {
    expect(gearMeterModel(player({ vx: -9, gear: 4, facing: -1 }), PARAMS).needle).toBeCloseTo(3, 9);
  });

  it('clamps at 4 above top speed', () => {
    expect(gearMeterModel(player({ vx: 20 }), PARAMS).needle).toBe(4);
  });

  it('sits at the bracket cell when cruising (gear 1 and gear 4)', () => {
    expect(gearMeterModel(player({ vx: 3, gear: 1, band: 1 }), PARAMS).needle).toBe(1);
    expect(gearMeterModel(player({ vx: 12, gear: 4, band: 4 }), PARAMS).needle).toBe(4);
  });

  it('is below the bracket while accelerating and above it while braking after a downshift', () => {
    const accel = gearMeterModel(player({ vx: 9, gear: 4, band: 3, moveDir: 1 }), PARAMS);
    expect(accel.needle).toBeLessThan(accel.selectedGear);
    const brake = gearMeterModel(player({ vx: 9, gear: 1, band: 3, moveDir: 1 }), PARAMS);
    expect(brake.needle).toBeGreaterThan(brake.selectedGear);
  });

  it('divides by gearSpeeds[1], not a hard-coded 3', () => {
    const doctored: GearMeterParams = { ...PARAMS, gearSpeeds: [0, 4, 8, 12, 16] };
    expect(gearMeterModel(player({ vx: 8 }), doctored).needle).toBeCloseTo(2, 9);
  });

  it('degenerate walking speed of 0 does not produce NaN', () => {
    const m = gearMeterModel(player({ vx: 5 }), { ...PARAMS, gearSpeeds: [0, 0, 0, 0, 0] });
    expect(m.needle).toBe(0);
  });
});

describe('gearMeterModel: drag meter', () => {
  it('null on the ground whatever airDistance holds', () => {
    expect(gearMeterModel(player({ vx: 12, band: 4, gear: 4, airDistance: 3 }), PARAMS).dragFill).toBeNull();
  });

  it('airborne above the floor: fraction of the next drop', () => {
    expect(gearMeterModel(airborne({ vx: 12, band: 4, gear: 4, airDistance: 3 }), PARAMS).dragFill).toBeCloseTo(0.5, 9);
  });

  it('starts at 0 on the takeoff step', () => {
    expect(gearMeterModel(airborne({ vx: 12, band: 4, gear: 4, airDistance: 0 }), PARAMS).dragFill).toBe(0);
  });

  it('wraps to the carried remainder after a drop (band lowered, airDistance minus 6)', () => {
    const m = gearMeterModel(airborne({ vx: 9, band: 3, gear: 3, airDistance: 0.1 }), PARAMS);
    expect(m.litBand).toBe(3);
    expect(m.dragFill).toBeCloseTo(0.1 / 6, 9);
  });

  it('is capped at 1 and never negative', () => {
    expect(gearMeterModel(airborne({ vx: 12, band: 4, gear: 4, airDistance: 7 }), PARAMS).dragFill).toBe(1);
    expect(gearMeterModel(airborne({ vx: 12, band: 4, gear: 4, airDistance: -1 }), PARAMS).dragFill).toBe(0);
  });

  it('hidden at blue (the floor) even though airDistance keeps growing', () => {
    expect(gearMeterModel(airborne({ vx: 3, band: 1, gear: 1, airDistance: 5 }), PARAMS).dragFill).toBeNull();
  });

  it('hidden at white (standing jump)', () => {
    expect(gearMeterModel(airborne({ airDistance: 2 }), PARAMS).dragFill).toBeNull();
  });

  it('shown at green, the first band above the floor', () => {
    expect(gearMeterModel(airborne({ vx: 6, band: 2, gear: 2, airDistance: 1.5 }), PARAMS).dragFill).toBeCloseTo(0.25, 9);
  });

  it('honours a different airDragMinBand', () => {
    const params: GearMeterParams = { ...PARAMS, airDragMinBand: 2 };
    expect(gearMeterModel(airborne({ vx: 6, band: 2, gear: 2, airDistance: 1 }), params).dragFill).toBeNull();
  });

  it('honours a different airDragTilesPerGear', () => {
    const params: GearMeterParams = { ...PARAMS, airDragTilesPerGear: 4 };
    expect(gearMeterModel(airborne({ vx: 12, band: 4, gear: 4, airDistance: 1 }), params).dragFill).toBeCloseTo(0.25, 9);
  });

  it('zero airDragTilesPerGear does not divide by zero', () => {
    const params: GearMeterParams = { ...PARAMS, airDragTilesPerGear: 0 };
    expect(gearMeterModel(airborne({ vx: 12, band: 4, gear: 4, airDistance: 1 }), params).dragFill).toBe(0);
  });
});

describe('gearMeterModel: pending shift', () => {
  it('null on the ground even with stale buffer fields', () => {
    expect(gearMeterModel(player({ shiftBufferNet: 1, shiftBufferSteps: 3 }), PARAMS).pendingGear).toBeNull();
  });

  it('airborne gear 1, one up-press: pending gear 2', () => {
    const m = gearMeterModel(airborne({ vx: 3, band: 1, gear: 1, shiftBufferNet: 1, shiftBufferSteps: 6 }), PARAMS);
    expect(m.pendingGear).toBe(2);
    expect(m.selectedGear).toBe(1);
  });

  it('accumulates net presses', () => {
    const m = gearMeterModel(airborne({ vx: 3, band: 1, gear: 1, shiftBufferNet: 2, shiftBufferSteps: 4 }), PARAMS);
    expect(m.pendingGear).toBe(3);
  });

  it('a down-press from gear 3', () => {
    const m = gearMeterModel(airborne({ vx: 9, band: 3, gear: 3, shiftBufferNet: -1, shiftBufferSteps: 2 }), PARAMS);
    expect(m.pendingGear).toBe(2);
  });

  it('clamps to 4 and shows nothing when the press cannot change the gear', () => {
    const m = gearMeterModel(airborne({ vx: 12, band: 4, gear: 4, shiftBufferNet: 1, shiftBufferSteps: 6 }), PARAMS);
    expect(m.pendingGear).toBeNull();
  });

  it('clamps to minGear and shows nothing at gear 1 for a down-press', () => {
    const m = gearMeterModel(airborne({ vx: 3, band: 1, gear: 1, shiftBufferNet: -1, shiftBufferSteps: 6 }), PARAMS);
    expect(m.pendingGear).toBeNull();
  });

  it('over-large net clamps to the far end', () => {
    const m = gearMeterModel(airborne({ vx: 3, band: 1, gear: 1, shiftBufferNet: 9, shiftBufferSteps: 6 }), PARAMS);
    expect(m.pendingGear).toBe(4);
  });

  it('null when the buffer window has run out or the net cancelled to 0', () => {
    expect(gearMeterModel(airborne({ gear: 1, shiftBufferNet: 1, shiftBufferSteps: 0 }), PARAMS).pendingGear).toBeNull();
    expect(gearMeterModel(airborne({ gear: 1, shiftBufferNet: 0, shiftBufferSteps: 5 }), PARAMS).pendingGear).toBeNull();
  });
});
