/**
 * HUD gear meter model: pure derivation of everything the meter draws from the
 * player's state. No Phaser, no DOM. The view is `GearMeterView.ts`.
 *
 * Field names follow docs/design/features/hud-gear-meter.md (litBand,
 * selectedGear, needle, dragFill, pendingGear). The meter is five cells
 * (white, then gears 1..4); the needle position is in cell widths, so the
 * view only multiplies by its cell pitch.
 *
 * Owner: ui-engineer. Spec: docs/design/features/hud-gear-meter.md.
 */
import type { Band, Gear, PlayerState, SimParams } from '../core/types';

/** Only the tuning-derived numbers the meter reads, so tests can pass a small object. */
export type GearMeterParams = Pick<SimParams, 'gearSpeeds' | 'minGear' | 'airDragTilesPerGear' | 'airDragMinBand'>;

export interface GearMeterModel {
  /** Band of actual speed (0 white .. 4 red): the lit cell. */
  readonly litBand: Band;
  /** Selected cruise gear 1..4: the bracket. */
  readonly selectedGear: Gear;
  /**
   * Speed needle position in cell widths from the centre of cell 0:
   * `|vx| / gearSpeeds[1]` clamped to 0..4. Cruise speeds sit on cell centres,
   * band edges on cell boundaries.
   */
  readonly needle: number;
  /** Drag meter fill 0..1 while airborne above `airDragMinBand`; null (hidden) otherwise. */
  readonly dragFill: number | null;
  /** Gear a buffered air shift will apply on landing; null when none or it cannot change the gear. */
  readonly pendingGear: Gear | null;
  /** Not grounded. The drop pulse only reads band changes made in the air. */
  readonly airborne: boolean;
}

/** What the meter shows at spawn and after a reset: white lit, bracket on gear 1, nothing else. */
export const INITIAL_GEAR_METER_MODEL: GearMeterModel = Object.freeze({
  litBand: 0,
  selectedGear: 1,
  needle: 0,
  dragFill: null,
  pendingGear: null,
  airborne: false,
});

const MAX_GEAR = 4;

const clamp = (v: number, lo: number, hi: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

function dragFill(player: PlayerState, params: GearMeterParams): number | null {
  if (player.grounded || player.band <= params.airDragMinBand) return null;
  if (params.airDragTilesPerGear <= 0) return 0;
  return clamp(player.airDistance / params.airDragTilesPerGear, 0, 1);
}

function pendingGear(player: PlayerState, params: GearMeterParams): Gear | null {
  if (player.grounded || player.shiftBufferSteps <= 0 || player.shiftBufferNet === 0) return null;
  const target = clamp(player.gear + player.shiftBufferNet, params.minGear, MAX_GEAR) as Gear;
  return target === player.gear ? null : target;
}

export function gearMeterModel(player: PlayerState, params: GearMeterParams): GearMeterModel {
  const walkSpeed = params.gearSpeeds[1];
  return {
    litBand: player.band,
    selectedGear: player.gear,
    needle: walkSpeed > 0 ? clamp(Math.abs(player.vx) / walkSpeed, 0, MAX_GEAR) : 0,
    dragFill: dragFill(player, params),
    pendingGear: pendingGear(player, params),
    airborne: !player.grounded,
  };
}
