/**
 * Typed view of src/data/palette.json plus small lookups. Pure (no Phaser).
 * Owner: art-director.
 */
import type { BandColor } from '../core/types';
import paletteJson from '../data/palette.json';
import { hexToRgb, mixCapped, saturation, spectrumTint, withLuminance, type Rgb, type TintStop } from './color';
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
    /** Mix toward the raw tint colour; for glow and trail, not the background. */
    readonly strength: number;
    /** How far a fully saturated tint pulls the background toward its dark hue (see `backgroundForSpeed`). */
    readonly backgroundStrength: number;
    /** Hard cap on the tinted background's relative luminance (keeps 3:1 against the dimmest gameplay colour). */
    readonly maxBackgroundLuminance: number;
  };
  readonly flash: { readonly color: string; readonly alpha: number; readonly durationMs: number };
  /** Direction C (pixel art): sizes and the colours that are not band colours. */
  readonly pixel: {
    readonly tileSize: number;
    readonly body: { readonly width: number; readonly height: number };
    /** 1 px line around the player that separates it from a same-coloured floor. */
    readonly keyline: string;
    /** Mix toward white for the lit top edge of a slab. */
    readonly lipMix: number;
    /** Mix toward the background for the shaded underside. */
    readonly shadeMix: number;
    /** Ghost tile dither wash: mix of the band colour into the background. */
    readonly ghostWashMix: number;
    /** Safe tile: dither darkening, rivet and lit lip mixes (toward background, background, white). */
    readonly safeDepthMix: number;
    readonly safeRivetMix: number;
    readonly safeLipMix: number;
    /** Solid tile: seam row under the lip and the side shade, mixes toward the background. */
    readonly solidSeamMix: number;
    readonly solidSideMix: number;
    /** Flashed body: shade mix of white toward the band fill. */
    readonly flashShadeMix: number;
    /** Ghost outline dash and gap, in pixels. */
    readonly ghostDash: readonly number[];
    readonly exit: { readonly frame: string; readonly doorway: string; readonly glow: string };
    readonly decor: {
      /** Star colour: mix of the background toward white. */
      readonly starMix: number;
      /** Ridge silhouettes: mix of the background toward black (far, near). */
      readonly ridgeFarShade: number;
      readonly ridgeNearShade: number;
    };
  };
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
const stopsCache = new WeakMap<Palette, readonly TintStop[]>();

/** Cached per palette object: the tint is sampled every frame. */
export function tintStops(p: Palette = palette): readonly TintStop[] {
  const hit = stopsCache.get(p);
  if (hit) return hit;
  const stops = resolveStops(p);
  stopsCache.set(p, stops);
  return stops;
}

function resolveStops(p: Palette): readonly TintStop[] {
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

/**
 * Colour of the world behind the tiles for the player's speed. The tint hue is
 * taken at the fixed dark luminance `tint.maxBackgroundLuminance`, and the
 * background moves toward it in proportion to how saturated the tint is. So
 * standing (white, almost no saturation) leaves the background unchanged, each
 * band gives a dark but visible hue (navy, forest, olive, wine), and no speed
 * ever lifts the background above the cap, which is what keeps gameplay colours
 * at 3:1 and text at 4.5:1 (docs/art/accessibility.md section 7).
 */
export function backgroundForSpeed(speed: number, topSpeed: number, p: Palette = palette): Rgb {
  const bg = hexToRgb(p.background);
  const t = topSpeed <= 0 ? 0 : speed / topSpeed;
  const tint = spectrumTint(tintStops(p), t);
  const cap = p.tint.maxBackgroundLuminance;
  const dark = withLuminance(tint, cap);
  return mixCapped(bg, dark, p.tint.backgroundStrength * saturation(tint), cap);
}
