/**
 * Background layers for direction C as white masks that the scene tints at
 * runtime (so the world hue can slide continuously with speed): a dithered
 * horizon glow, stars and two parallax ridges that tile horizontally. Plus the
 * colours to tint them with. Pure; no Phaser. Owner: art-director.
 */
import { mix, relativeLuminance, withLuminance, type Rgb } from '../color';
import { backgroundForSpeed, palette, tintForSpeed } from '../palette';
import { bayer, createRaster, rgba, setPixel, type Raster } from './raster';

export const VIEW_W = 480;
export const VIEW_H = 270;
const WHITE_PX = rgba({ r: 255, g: 255, b: 255 });

export interface RidgeSpec {
  /** Where this layer's top edge sits in the 270 px view when the camera is at rest. */
  readonly top: number;
  readonly height: number;
  readonly base: number;
  readonly amp: number;
  readonly k1: number;
  readonly k2: number;
  readonly phase: number;
}

export const RIDGES = {
  far: { top: 128, height: 88, base: 168, amp: 26, k1: 2, k2: 5, phase: 0.9 },
  near: { top: 160, height: 56, base: 190, amp: 18, k1: 3, k2: 8, phase: 1.7 },
} as const satisfies Record<string, RidgeSpec>;

/** Ridge height (view y) at column x. Integer wave counts make it repeat every `VIEW_W` px. */
export function ridgeHeight(spec: RidgeSpec, x: number): number {
  const a = (2 * Math.PI * x) / VIEW_W;
  return Math.round(
    spec.base - spec.amp * Math.abs(Math.sin(a * spec.k1 + spec.phase)) - spec.amp * 0.5 * Math.abs(Math.sin(a * spec.k2)),
  );
}

/** Horizon glow: ordered dither, strongest at y = 175, none above y = 55 or below y = 295. */
export function bakeHorizon(): Raster {
  const r = createRaster(VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y++) {
    const t = Math.min(1, Math.max(0, 1 - Math.abs(y - 175) / 120));
    for (let x = 0; x < VIEW_W; x++) if (bayer(x, y) < t) setPixel(r, x, y, WHITE_PX);
  }
  return r;
}

/** 46 single-pixel stars in the upper sky; deterministic. */
export function bakeStars(): Raster {
  const r = createRaster(VIEW_W, VIEW_H);
  let s = 5;
  const rnd = (): number => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 46; i++) setPixel(r, Math.floor(rnd() * VIEW_W), Math.floor(rnd() * 130), WHITE_PX);
  return r;
}

/** A ridge silhouette mask (`VIEW_W` x spec.height) with a dithered top edge. */
export function bakeRidge(layer: keyof typeof RIDGES): Raster {
  const spec: RidgeSpec = RIDGES[layer];
  const r = createRaster(VIEW_W, spec.height);
  for (let x = 0; x < VIEW_W; x++) {
    const h = ridgeHeight(spec, x) - spec.top;
    for (let y = Math.max(0, h); y < spec.height; y++) setPixel(r, x, y, WHITE_PX);
    if (x % 2 === 0) setPixel(r, x, h - 1, WHITE_PX);
  }
  return r;
}

export interface SceneryColors {
  /** Camera background (flat field). */
  readonly base: Rgb;
  /** Tint for the horizon glow mask: the pace hue at the decor luminance cap. */
  readonly hue: Rgb;
  readonly star: Rgb;
  readonly ridgeFar: Rgb;
  readonly ridgeNear: Rgb;
  /** Suggested alpha for the horizon mask: sparser when standing, full once moving. */
  readonly horizonAlpha: number;
}

/** Colours for the background layers at a speed. Every colour stays at or below `tint.maxBackgroundLuminance`. */
export function sceneryColors(speed: number, topSpeed: number): SceneryColors {
  const base = backgroundForSpeed(speed, topSpeed);
  const black: Rgb = { r: 0, g: 0, b: 0 };
  const cap = palette.tint.maxBackgroundLuminance;
  const hue = withLuminance(tintForSpeed(speed, topSpeed), cap);
  return {
    base,
    hue,
    star: mix(base, { r: 255, g: 255, b: 255 }, palette.pixel.decor.starMix),
    ridgeFar: mix(base, black, palette.pixel.decor.ridgeFarShade),
    ridgeNear: mix(base, black, palette.pixel.decor.ridgeNearShade),
    horizonAlpha: speed > 0 ? 1 : 0.6,
  };
}

/** The decor colour that can sit behind a ghost outline at its brightest: the pace hue. */
export function brightestDecor(speed: number, topSpeed: number): Rgb {
  const c = sceneryColors(speed, topSpeed);
  return relativeLuminance(c.hue) > relativeLuminance(c.star) ? c.hue : c.star;
}
