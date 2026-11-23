/**
 * Sprites for emitters and bolts, per `docs/design/features/projectiles.md` "Readability". Pure; no
 * Phaser; render-only. Owner: art-director.
 *
 * Kinds: `grey` (hits everyone), `white` (hits only a standing runner, `band=W`), and the four
 * bands. Shape tells the kind before colour does:
 *  - bolts are 8 x 8, the size of the shot box (`projectileSizeTiles` 0.5 of a 16 px tile). A banded
 *    bolt is a diamond carrying the band's pattern (stripes, dots, V chevron, checker); the white
 *    bolt is a hollow diamond; the grey bolt is a solid four-point star, so "hits everyone" reads by
 *    silhouette alone.
 *  - emitters are 16 x 16: an octagon body with a 3 px muzzle on the `dir` face and the kind's
 *    glyph on the body (the band's pattern, a hollow square for white, an X for grey). The `tell`
 *    frame is the 18-step glow before a shot: body fill brightened, glyph inverted to dark ink, bore
 *    lit white. It is a static fill change, so it doubles as the reduced-motion frame.
 *  - the catcher (`sink`) marks where a bolt's range ends; the shimmer marks a bolt passing
 *    harmlessly through a body.
 */
import type { BandColor } from '../../core/types';
import { hexToRgb, mix, type Rgb } from '../color';
import { palette, patternOf } from '../palette';
import { pixelPatternOn } from '../patterns';
import { bayer, createRaster, fillRect, rgba, setPixel, type Raster, type Rgba } from './raster';
import { turnPoint, type Dir } from './movers';

export const BOLT_KINDS = ['grey', 'white', 'blue', 'green', 'yellow', 'red'] as const;
export type BoltKind = (typeof BOLT_KINDS)[number];
export const BOLT_SIZE = 8;
export const EMITTER_SIZE = 16;
export const EMITTER_STATES = ['idle', 'tell'] as const;
export type EmitterState = (typeof EMITTER_STATES)[number];
export const SHIMMER_FRAMES = 4;
export const SHIMMER_SIZE = 16;
export const SINK_SIZE = 16;

const WHITE: Rgba = [255, 255, 255, 255];
const WHITE_RGB: Rgb = { r: 255, g: 255, b: 255 };
const bg = (): Rgb => hexToRgb(palette.background);

interface KindColors {
  readonly fill: Rgb;
  readonly outline: Rgb;
  readonly ink: Rgb;
}

function kindColors(kind: BoltKind): KindColors {
  if (kind === 'grey') {
    const f = hexToRgb(palette.safeTile.fill);
    return { fill: f, outline: hexToRgb(palette.safeTile.outline), ink: bg() };
  }
  const s = palette.gears[kind as BandColor].solid;
  return { fill: hexToRgb(s.fill), outline: hexToRgb(s.outline), ink: hexToRgb(s.ink) };
}

/** `d` = |dx| + |dy| from the 8 x 8 centre: <= 3 is the diamond's inside, 3.5 < d <= 4 its rim. */
const diamondD = (x: number, y: number): number => Math.abs(x - 3.5) + Math.abs(y - 3.5);

/** Ink pixels of each band's pattern inside the diamond (hand-set: 8 px is too small for the tile cells). */
const BOLT_INK: Readonly<Record<'blue' | 'green' | 'yellow' | 'red', readonly (readonly [number, number])[]>> = {
  blue: [[2, 2], [3, 2], [4, 2], [5, 2], [2, 5], [3, 5], [4, 5], [5, 5]],
  green: [[3, 2], [2, 4], [5, 4]],
  yellow: [[2, 2], [5, 2], [3, 3], [4, 3], [3, 5], [4, 5]],
  red: [],
};

const STAR = ['...##...', '...##...', '..####..', '########', '########', '..####..', '...##...', '...##...'] as const;

/** One 8 x 8 bolt, origin (0.5, 0.5), centred on the shot's position. Direction does not matter (symmetric). */
export function bakeBolt(kind: BoltKind): Raster {
  const r = createRaster(BOLT_SIZE, BOLT_SIZE);
  const { fill, outline, ink } = kindColors(kind);
  if (kind === 'grey') {
    STAR.forEach((row, y) => {
      for (let x = 0; x < BOLT_SIZE; x++) if (row[x] === '#') setPixel(r, x, y, rgba(outline));
    });
    fillRect(r, 3, 3, 2, 2, rgba(fill));
    return r;
  }
  for (let y = 0; y < BOLT_SIZE; y++) {
    for (let x = 0; x < BOLT_SIZE; x++) {
      const d = diamondD(x, y);
      if (d > 4) continue;
      if (d > 3) setPixel(r, x, y, rgba(outline));
      else if (kind !== 'white') setPixel(r, x, y, rgba(fill));
    }
  }
  if (kind === 'red') {
    for (let y = 0; y < BOLT_SIZE; y++) for (let x = 0; x < BOLT_SIZE; x++) if (diamondD(x, y) <= 3 && (x + y) % 2 === 0) setPixel(r, x, y, rgba(ink));
  } else if (kind !== 'white') {
    for (const [x, y] of BOLT_INK[kind]) setPixel(r, x, y, rgba(ink));
  }
  return r;
}

/** Canonical emitter facing right: body 12 x 12 at x 1-12, y 2-13 with cut corners; muzzle x 13-15, y 6-9. */
function inBody(x: number, y: number): boolean {
  if (x < 1 || x > 12 || y < 2 || y > 13) return false;
  const cx = Math.min(x - 1, 12 - x);
  const cy = Math.min(y - 2, 13 - y);
  return cx + cy >= 2;
}

const inMuzzle = (x: number, y: number): boolean => x >= 13 && x <= 15 && y >= 6 && y <= 9;
const inBore = (x: number, y: number): boolean => x >= 13 && x <= 15 && y >= 7 && y <= 8;

/** Glyph ink inside the 8 x 8 core (canonical core origin (3, 4)), drawn upright after the body is turned. */
function glyphOn(kind: BoltKind, i: number, j: number): boolean {
  if (kind === 'grey') return i === j || i + j === 7 || i === j + 1 || i + j === 8;
  if (kind === 'white') return i >= 1 && i <= 6 && j >= 1 && j <= 6 && (i === 1 || i === 6 || j === 1 || j === 6);
  return pixelPatternOn(patternOf(kind as BandColor), i, j, 8);
}

/** One 16 x 16 emitter frame, origin (0, 0). The muzzle is on the `dir` face. */
export function bakeEmitter(dir: Dir, kind: BoltKind, state: EmitterState): Raster {
  const r = createRaster(EMITTER_SIZE, EMITTER_SIZE);
  const { fill, outline, ink } = kindColors(kind);
  const tell = state === 'tell';
  const bodyFill = rgba(tell ? fill : mix(fill, bg(), 0.55));
  const edge = rgba(tell ? mix(outline, WHITE_RGB, 0.5) : outline);
  const put = (x: number, y: number, c: Rgba): void => {
    const [tx, ty] = turnPoint(dir, x, y, EMITTER_SIZE);
    setPixel(r, tx, ty, c);
  };
  for (let y = 0; y < EMITTER_SIZE; y++) {
    for (let x = 0; x < EMITTER_SIZE; x++) {
      if (inBody(x, y)) {
        const rim = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1);
        put(x, y, rim ? edge : bodyFill);
      } else if (inMuzzle(x, y)) {
        const bore = inBore(x, y);
        put(x, y, bore ? (tell ? WHITE : rgba(bg())) : edge);
      }
    }
  }
  const core = [turnPoint(dir, 3, 4, EMITTER_SIZE), turnPoint(dir, 10, 11, EMITTER_SIZE)];
  const ox = Math.min(core[0]![0], core[1]![0]);
  const oy = Math.min(core[0]![1], core[1]![1]);
  const glyphInk = rgba(tell ? ink : outline);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (glyphOn(kind, i, j)) setPixel(r, ox + i, oy + j, glyphInk);
  return r;
}

/**
 * Pass-through shimmer, 16 x 16 white mask, origin (0.5, 0.5): a dithered diamond ring that
 * shifts each frame. Draw it over a body at the bolt's position, tinted the bolt's colour, while a
 * shot that cannot hit that body overlaps it.
 */
export function bakeShimmer(frame: number): Raster {
  const f = Math.min(Math.max(frame, 0), SHIMMER_FRAMES - 1);
  const r = createRaster(SHIMMER_SIZE, SHIMMER_SIZE);
  for (let y = 0; y < SHIMMER_SIZE; y++) {
    for (let x = 0; x < SHIMMER_SIZE; x++) {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      const ring = 5 + f;
      if (Math.abs(d - ring) < 1.2 && bayer(x + f, y + 2 * f) < 0.8) setPixel(r, x, y, WHITE);
    }
  }
  return r;
}

const SINK_RIGHT = [
  '................', '................', '................', '.........##..###',
  '..........##.###', '...........##..#', '............##.#', '............##.#',
  '............##.#', '............##.#', '...........##..#', '..........##.###',
  '.........##..###', '................', '................', '................',
] as const;

/**
 * The catcher where a bolt's range ends, 16 x 16 white mask, origin (0, 0): a bracket on the
 * far side of the last cell with a funnel chevron pointing into it. `dir` is the bolt's flight direction.
 */
export function bakeSink(dir: Dir): Raster {
  const r = createRaster(SINK_SIZE, SINK_SIZE);
  SINK_RIGHT.forEach((row, y) => {
    for (let x = 0; x < SINK_SIZE; x++) {
      if (row[x] !== '#') continue;
      const [tx, ty] = turnPoint(dir, x, y, SINK_SIZE);
      setPixel(r, tx, ty, WHITE);
    }
  });
  return r;
}

export function boltFrameNames(): {
  bolt: (kind: BoltKind) => string;
  emitter: (dir: Dir, kind: BoltKind, state: EmitterState) => string;
  shimmer: (n: number) => string;
  sink: (dir: Dir) => string;
} {
  return {
    bolt: (kind) => `bolt/${kind}`,
    emitter: (dir, kind, state) => `emitter/${dir}/${kind}/${state}`,
    shimmer: (n) => `bolt/shimmer/${n}`,
    sink: (dir) => `bolt/sink/${dir}`,
  };
}
