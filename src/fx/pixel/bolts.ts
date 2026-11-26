/**
 * Sprites for emitters and bolts, per `docs/design/features/projectiles.md` "Readability". Pure; no
 * Phaser; render-only. Owner: art-director.
 *
 * Kinds: `grey` (hits everyone), `white` (hits only a standing runner, `band=W`), and the four
 * bands. Shape tells the kind before colour does:
 *  - bolts: the drawn core fills the whole 8 x 8 shot box (`projectileSizeTiles` 0.5) edge to edge, with a 1 px
 *    dark outline outside it (10 x 10), solid fills only. Banded = diamond carrying the band's pattern;
 *    white = clipped solid block, pale; grey = eight-point spiked ball in mid grey (hits everyone, so it
 *    reads as the hazard). `bolt/<kind>/<dir>` adds a 3 px tail behind the flight direction. No animation.
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
import { bayer, createRaster, rgba, setPixel, type Raster, type Rgba } from './raster';
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

/** Ink pixels of each band's pattern inside the diamond (hand-set: 8 px is too small for the tile cells). Core coordinates 0-7. */
const BOLT_INK: Readonly<Record<'blue' | 'green' | 'yellow' | 'red', readonly (readonly [number, number])[]>> = {
  blue: [[2, 2], [3, 2], [4, 2], [5, 2], [2, 5], [3, 5], [4, 5], [5, 5]],
  green: [[3, 2], [2, 4], [5, 4], [4, 4]],
  yellow: [[2, 2], [5, 2], [3, 3], [4, 3], [3, 5], [4, 5]],
  red: [[2, 3], [3, 4], [4, 3], [5, 4], [3, 2], [4, 5]],
};

/** Banded diamond: the tips touch all four edges of the 8 x 8 hit box. */
const DIAMOND = ['...##...', '..####..', '.######.', '########', '########', '.######.', '..####..', '...##...'] as const;
/** White: a solid block with the corners clipped by one pixel (no point, so it is not a diamond). */
const BLOCK = ['.######.', '########', '########', '########', '########', '########', '########', '.######.'] as const;
/** Grey: a 6 x 6 body with eight spikes (tips on all four edges and all four corners of the box): heavy, not a sparkle. */
const SPIKED = ['#..##..#', '.######.', '.######.', '########', '########', '.######.', '.######.', '#..##..#'] as const;

export const BOLT_DRAWN = BOLT_SIZE + 2; // 8 px core plus a 1 px dark outline on every side
export const BOLT_TAIL = 4; // joint pixel, 3 px of streak: reads as a tail behind the core

type Cell = Rgba | null;

/** Fill colour of a kind's core: also the tail colour. */
export function boltFill(kind: BoltKind): Rgb {
  if (kind === 'grey') return hexToRgb(palette.ui.textMuted);
  if (kind === 'white') return hexToRgb(palette.gears.white.solid.fill);
  return kindColors(kind).fill;
}

/** The dark outline colour (the game's background): readable against every tile and keeps the core clear of it. */
export const boltOutline = (): Rgb => bg();

/** The 8 x 8 filled core of a bolt (no outline). */
function coreCells(kind: BoltKind): Cell[][] {
  const shape = kind === 'grey' ? SPIKED : kind === 'white' ? BLOCK : DIAMOND;
  const fill = rgba(boltFill(kind));
  const cells: Cell[][] = shape.map((row) => [...row].map((c) => (c === '#' ? fill : null)));
  if (kind !== 'grey' && kind !== 'white') {
    const ink = rgba(kindColors(kind).ink);
    for (const [x, y] of BOLT_INK[kind]) if (cells[y]![x] !== null) cells[y]![x] = ink;
  }
  return cells;
}

function stampCore(r: Raster, bx: number, by: number, kind: BoltKind): void {
  const cells = coreCells(kind);
  const dark = rgba(bg());
  for (let y = -1; y <= BOLT_SIZE; y++) {
    for (let x = -1; x <= BOLT_SIZE; x++) {
      if (cells[y]?.[x]) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (cells[y + dy]?.[x + dx]) { near = true; break; }
      if (near) setPixel(r, bx + 1 + x, by + 1 + y, dark);
    }
  }
  cells.forEach((row, y) => row.forEach((c, x) => { if (c) setPixel(r, bx + 1 + x, by + 1 + y, c); }));
}

/** One 10 x 10 bolt (8 x 8 core + 1 px outline), origin (0.5, 0.5), centred on the shot's position, no tail. */
export function bakeBolt(kind: BoltKind): Raster {
  const r = createRaster(BOLT_DRAWN, BOLT_DRAWN);
  stampCore(r, 0, 0, kind);
  return r;
}

/** Top-left of the 10 x 10 bolt inside its tail frame. */
export function boltTailOrigin(dir: Dir): readonly [number, number] {
  return dir === 'r' ? [BOLT_TAIL, 0] : dir === 'd' ? [0, BOLT_TAIL] : [0, 0];
}

/** Pivot (0..1) that puts the centre of the 10 x 10 bolt on the shot's position. */
export function boltTailPivot(dir: Dir): { x: number; y: number } {
  const [bx, by] = boltTailOrigin(dir);
  const horiz = dir === 'l' || dir === 'r';
  return {
    x: (bx + BOLT_DRAWN / 2) / (horiz ? BOLT_DRAWN + BOLT_TAIL : BOLT_DRAWN),
    y: (by + BOLT_DRAWN / 2) / (horiz ? BOLT_DRAWN : BOLT_DRAWN + BOLT_TAIL),
  };
}

/**
 * A bolt with its tail: the 10 x 10 bolt plus a 2 px wide, 3 px long streak (with a 1 px outline) behind it, along
 * `dir` = the bolt's flight direction. 14 x 10 for l and r, 10 x 14 for u and d. The core stays upright.
 * Pivot: `boltTailPivot(dir)`.
 */
export function bakeBoltTail(dir: Dir, kind: BoltKind): Raster {
  const horiz = dir === 'l' || dir === 'r';
  const r = createRaster(horiz ? BOLT_DRAWN + BOLT_TAIL : BOLT_DRAWN, horiz ? BOLT_DRAWN : BOLT_DRAWN + BOLT_TAIL);
  const [bx, by] = boltTailOrigin(dir);
  stampCore(r, bx, by, kind);
  const fill = boltFill(kind);
  const dark = rgba(bg());
  const at = (along: number, lat: number): readonly [number, number] =>
    dir === 'r' ? [bx - along, by + lat] : dir === 'l' ? [bx + BOLT_DRAWN - 1 + along, by + lat] : dir === 'd' ? [bx + lat, by - along] : [bx + lat, by + BOLT_DRAWN - 1 + along];
  for (let along = 0; along <= BOLT_TAIL; along++) {
    if (along >= 1) for (const lat of [3, 6]) { const [x, y] = at(along, lat); setPixel(r, x, y, dark); }
    for (const lat of [4, 5]) {
      const [x, y] = at(along, lat);
      if (along === BOLT_TAIL) setPixel(r, x, y, dark);
      else setPixel(r, x, y, rgba(along === BOLT_TAIL - 1 ? mix(fill, bg(), 0.35) : fill));
    }
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
  '................', '................', '................', '.............##.',
  '.............##.', '.............##.', '......##.....##.', '......##.....##.',
  '.............##.', '.............##.', '.............##.', '.............##.',
  '................', '................', '................', '................',
] as const;

/**
 * The catcher where a bolt's range ends, 16 x 16 white mask, origin (0, 0): a flat stop bar on the
 * far side of the last cell with a pip in front of it (no teeth or points: nothing harmless may look like a spike). `dir` is the bolt's flight direction.
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
  boltTail: (kind: BoltKind, dir: Dir) => string;
  emitter: (dir: Dir, kind: BoltKind, state: EmitterState) => string;
  shimmer: (n: number) => string;
  sink: (dir: Dir) => string;
} {
  return {
    bolt: (kind) => `bolt/${kind}`,
    boltTail: (kind, dir) => `bolt/${kind}/${dir}`,
    emitter: (dir, kind, state) => `emitter/${dir}/${kind}/${state}`,
    shimmer: (n) => `bolt/shimmer/${n}`,
    sink: (dir) => `bolt/sink/${dir}`,
  };
}
