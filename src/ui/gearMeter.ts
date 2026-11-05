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
import { MAX_GEAR, type Band, type Gear, type PlayerState, type SimParams } from '../core/types';

/** Only the tuning-derived numbers the meter reads, so tests can pass a small object. */
export type GearMeterParams = Pick<
  SimParams,
  'gearSpeeds' | 'colorBandEdges' | 'minGear' | 'airDragTilesPerGear' | 'airDragMinBand'
>;

export interface GearMeterModel {
  /** Band of actual speed (0 white .. 4 red): the lit cell. */
  readonly litBand: Band;
  /** Selected cruise gear 1..4: the bracket. */
  readonly selectedGear: Gear;
  /**
   * Speed needle position in cell widths from the centre of cell 0:
   * piecewise-linear through the knots (0 -> 0, edge 1 -> 0.5, gear 1 -> 1,
   * edge 2 -> 1.5, ..., gear 4 -> 4), clamped to 0..4. Cruise speeds sit on cell
   * centres and band edges on cell boundaries whatever the tuning, so the needle
   * is inside the lit cell exactly when the band says so.
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

/**
 * Needle position for a speed. Knots interleave the speeds (cell centres, index
 * i) with the band edges (cell boundaries, i - 0.5). Non-increasing knots from
 * doctored tuning are skipped, so the result is always finite and monotonic.
 */
export function needlePosition(speed: number, params: GearMeterParams): number {
  const v = Math.abs(speed);
  if (!Number.isFinite(v)) return 0;
  let prevS = params.gearSpeeds[0] ?? 0;
  let prevP = 0;
  for (let i = 1; i <= MAX_GEAR; i++) {
    const knots: readonly (readonly [number, number])[] = [
      [params.colorBandEdges[i - 1] ?? Number.NaN, i - 0.5],
      [params.gearSpeeds[i] ?? Number.NaN, i],
    ];
    for (const [s, p] of knots) {
      if (!(s > prevS)) continue;
      if (v <= s) return prevP + ((v - prevS) / (s - prevS)) * (p - prevP);
      prevS = s;
      prevP = p;
    }
  }
  return prevP === 0 ? 0 : MAX_GEAR;
}

export function gearMeterModel(player: PlayerState, params: GearMeterParams): GearMeterModel {
  return {
    litBand: player.band,
    selectedGear: player.gear,
    needle: needlePosition(player.vx, params),
    dragFill: dragFill(player, params),
    pendingGear: pendingGear(player, params),
    airborne: !player.grounded,
  };
}
