/**
 * Effect frames for the cutover, baked as white masks that the scene tints at runtime: the dust
 * puff on landing, the ring burst on a band change, and the speed lines at red. Pure; no Phaser;
 * render-only (they never feed the sim). Every pixel is pure white at full alpha, so a tint is a
 * single colour swap, and every fade is Bayer dither (never alpha), so the frames stay 1-bit pixel
 * art. Owner: art-director.
 *
 * Names (atlas `pixel-fx`): `fx/dust/land_<0-3>`, `fx/ring/<0-3>`, `fx/speed/<12|20|32>_<a|b>`, `fx/wipe/<0|1>`,
 * `fx/why/<blue|green|yellow|red>/<bold|hold|fade>`.
 */
import type { BandColor } from '../../core/types';
import { PIXEL_CELLS, pixelPatternOn } from '../patterns';
import { patternOf } from '../palette';
import { bayer, createRaster, setPixel, type Raster, type Rgba } from './raster';

const WHITE: Rgba = [255, 255, 255, 255];

export const DUST_W = 24;
export const DUST_H = 8;
export const DUST_FRAMES = 4;
/** Lit fraction of each dust frame (Bayer threshold): the puff thins as it spreads. */
export const DUST_DENSITY: readonly number[] = [1, 1, 0.8, 0.6];

export const RING_SIZE = 48;
export const RING_FRAMES = 4;
/** Ring radii in pixels and lit fractions: the ring grows and thins out. */
export const RING_RADII: readonly number[] = [8, 13, 18, 22];
export const RING_DENSITY: readonly number[] = [1, 0.75, 0.5, 0.3];

export const SPEED_LENGTHS: readonly number[] = [12, 20, 32];
export const SPEED_PHASES: readonly string[] = ['a', 'b'];
/** Lit fraction at the leading end and at the tail of a speed line. */
export const SPEED_LEAD_DENSITY = 1;
export const SPEED_TAIL_DENSITY = 0.15;

/** The specks of a landing puff: 4 per side, flying out and up from the feet. */
const DUST_SPECKS_PER_SIDE = 4;

/** One frame of the landing dust, 24 x 8, feet on the bottom row, centred: use origin (0.5, 1). */
export function bakeDustFrame(frame: number): Raster {
  const t = Math.min(Math.max(frame, 0), DUST_FRAMES - 1);
  const r = createRaster(DUST_W, DUST_H);
  const size = t < 2 ? 2 : 1;
  const density = DUST_DENSITY[t] ?? 1;
  for (const side of [-1, 1]) {
    for (let k = 0; k < DUST_SPECKS_PER_SIDE; k++) {
      const dx = Math.round((1 + k * 0.6) * (t + 1) * 0.9) + 1;
      const rise = Math.round(0.8 * (t + 1) * (k % 2 === 1 ? 1 : 0.6));
      const x = side < 0 ? DUST_W / 2 - dx - size + 1 : DUST_W / 2 + dx - 1;
      const y = DUST_H - 1 - rise - (size - 1);
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) if (bayer(x + i, y + j) < density) setPixel(r, x + i, y + j, WHITE);
      }
    }
  }
  return r;
}

/** One step of the band-change ring, 48 x 48, centred (origin (0.5, 0.5)): a 2 px ring that grows and thins. */
export function bakeRingFrame(step: number): Raster {
  const s = Math.min(Math.max(step, 0), RING_FRAMES - 1);
  const r = createRaster(RING_SIZE, RING_SIZE);
  const c = (RING_SIZE - 1) / 2;
  const radius = RING_RADII[s] ?? 8;
  const density = RING_DENSITY[s] ?? 1;
  for (let y = 0; y < RING_SIZE; y++) {
    for (let x = 0; x < RING_SIZE; x++) {
      const d = Math.hypot(x - c, y - c);
      if (Math.abs(d - radius) < 1 && bayer(x, y) < density) setPixel(r, x, y, WHITE);
    }
  }
  return r;
}

/**
 * A 1 px speed line, `length` px wide, brightest (always lit) at its right end and dithered out
 * towards the left tail: draw it trailing behind a body moving right (flipX when moving left). Phase
 * `a` and `b` use different Bayer rows, so two lines side by side do not share holes. Origin (1, 0).
 */
export function bakeSpeedLine(length: number, phase: number): Raster {
  const r = createRaster(length, 1);
  const row = phase === 0 ? 0 : 2;
  for (let x = 0; x < length; x++) {
    const along = length === 1 ? 1 : x / (length - 1);
    const density = SPEED_TAIL_DENSITY + (SPEED_LEAD_DENSITY - SPEED_TAIL_DENSITY) * along;
    if (x === length - 1 || bayer(x, row) < density) setPixel(r, x, 0, WHITE);
  }
  return r;
}

export const WIPE_W = 480;
export const WIPE_H = 270;
export const WIPE_FRAMES = 2;
/**
 * Lit fraction of each wipe frame. The drop flash is a dither, not a solid fill: frame 0 lights half the
 * pixels, frame 1 a quarter, so it reads as a pattern change (visible without colour, and a third of the
 * screen area of a solid flash). The scene draws it white at `palette.flash.alpha`, one frame each.
 */
export const WIPE_DENSITY: readonly number[] = [0.5, 0.25];

/** One frame of the screen dither wipe, 480 x 270, white mask: draw it at (0, 0) over the world, under the HUD. */
export function bakeWipeFrame(frame: number): Raster {
  const t = Math.min(Math.max(frame, 0), WIPE_FRAMES - 1);
  const r = createRaster(WIPE_W, WIPE_H);
  const density = WIPE_DENSITY[t] ?? 0.5;
  for (let y = 0; y < WIPE_H; y++) {
    for (let x = 0; x < WIPE_W; x++) if (bayer(x, y) < density) setPixel(r, x, y, WHITE);
  }
  return r;
}

/** The four colored bands that have tiles (white has none, so it never "fails" a body). */
export type WhyBand = Exclude<BandColor, 'white'>;
export const WHY_BANDS: readonly WhyBand[] = ['blue', 'green', 'yellow', 'red'];
/** "Why you fell" frames: one per tile of the highlighted run, 16 x 16, drawn at the tile's top-left (origin (0, 0)). */
export const WHY_STEPS = ['bold', 'hold', 'fade'] as const;
export type WhyStep = (typeof WHY_STEPS)[number];
export const WHY_SIZE = 16;
/** Tile pattern cell offset inside a 16 px tile (the same as the tile art). */
const WHY_PAT_X = 2;
const WHY_PAT_Y = 4;

/**
 * One tile of the "why you fell" cue, a white mask to tint with `ui.text`: a ring on the tile's own
 * edge plus the band's tile pattern (stripes, dots, chevrons, checker) over the tile, so the cue
 * names the gear you needed by shape, not by hue. `bold` is a 2 px ring (first beat), `hold` a 1 px
 * ring (steady; the whole cue under reduced motion), `fade` the same dithered to half (last beat).
 * The ring sits on the tile's own edge, so neighbouring tiles of a run join into one outline.
 */
export function bakeWhyFrame(band: WhyBand, step: WhyStep): Raster {
  const r = createRaster(WHY_SIZE, WHY_SIZE);
  const thick = step === 'bold' ? 2 : 1;
  const density = step === 'fade' ? 0.5 : 1;
  const id = patternOf(band);
  const p = PIXEL_CELLS.tile;
  for (let y = 0; y < WHY_SIZE; y++) {
    for (let x = 0; x < WHY_SIZE; x++) {
      const ring = x < thick || y < thick || x >= WHY_SIZE - thick || y >= WHY_SIZE - thick;
      const i = x - WHY_PAT_X;
      const j = y - WHY_PAT_Y;
      const mark = i >= 0 && j >= 0 && i < p.width && j < p.height && pixelPatternOn(id, i, j, p.width);
      if ((ring || mark) && bayer(x, y) < density) setPixel(r, x, y, WHITE);
    }
  }
  return r;
}

export function effectFrameNames(): {
  dust: (n: number) => string;
  ring: (n: number) => string;
  speed: (length: number, phase: number) => string;
  wipe: (n: number) => string;
  why: (band: WhyBand, step: WhyStep) => string;
} {
  return {
    why: (band, step) => `fx/why/${band}/${step}`,
    wipe: (n) => `fx/wipe/${n}`,
    dust: (n) => `fx/dust/land_${n}`,
    ring: (n) => `fx/ring/${n}`,
    speed: (length, phase) => `fx/speed/${length}_${SPEED_PHASES[phase] ?? 'a'}`,
  };
}
