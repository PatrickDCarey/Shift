/**
 * Typed view of src/data/palette.json plus small lookups. Pure (no Phaser).
 * Owner: art-director.
 */
import type { BandColor } from '../core/types';
import paletteJson from '../data/palette.json';
import { hexToRgb, spectrumTint, type Rgb, type TintStop } from './color';
import { isPatternId, type PatternId } from './patterns';

export interface TileTreatmentColors {
  readonly fill: string;
  readonly outline: string;
  /** Colour of the pattern marks. */
  readonly ink: string;
}

export interface GearStyle {
  readonly label: string;
  readonly pattern: string;
  readonly solid: TileTreatmentColors;
  readonly ghost: TileTreatmentColors;
}

export interface TreatmentParams {
  readonly fillAlpha: number;
  readonly outlineWidth: number;
  readonly inkAlpha: number;
  readonly dash: readonly number[] | null;
}

export interface Palette {
  readonly version: number;
  readonly background: string;
  readonly safeTile: { readonly fill: string; readonly outline: string; readonly pattern: string };
  readonly gears: Readonly<Record<BandColor, GearStyle>>;
  readonly treatment: { readonly solid: TreatmentParams; readonly ghost: TreatmentParams };
  readonly pattern: { readonly minStrokePx: number };
  readonly ui: {
    readonly text: string;
    readonly textMuted: string;
    readonly panel: string;
    readonly panelBorder: string;
    readonly focus: string;
  };
  readonly tint: {
    readonly stops: ReadonlyArray<{ readonly t: number; readonly gear: string }>;
    readonly strength: number;
  };
  readonly flash: { readonly color: string; readonly alpha: number; readonly durationMs: number };
}

export const palette: Palette = paletteJson;

/** Treatment of a tile: solid = you can stand on it now; ghost = you would fall through. */
export type TileMode = 'solid' | 'ghost';

export function patternOf(color: BandColor): PatternId {
  const id = palette.gears[color].pattern;
  if (!isPatternId(id)) throw new Error(`palette.json: unknown pattern id "${id}" for ${color}`);
  return id;
}

/** Tint stops with gear names resolved to hex, ready for `spectrumTint`. */
export function tintStops(p: Palette = palette): readonly TintStop[] {
  return p.tint.stops.map((s) => {
    const style = p.gears[s.gear as BandColor];
    if (!style) throw new Error(`palette.json: tint stop references unknown gear "${s.gear}"`);
    return { t: s.t, color: style.solid.fill };
  });
}

/**
 * World tint for the player's actual speed. `speed` and `topSpeed` share a unit
 * (tiles per second from the sim; topSpeed = gearSpeeds[4]).
 */
export function tintForSpeed(speed: number, topSpeed: number): Rgb {
  const t = topSpeed <= 0 ? 0 : speed / topSpeed;
  return spectrumTint(tintStops(), t);
}

export function backgroundRgb(): Rgb {
  return hexToRgb(palette.background);
}
