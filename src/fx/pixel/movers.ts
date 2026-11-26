/**
 * Sprites for moving slabs (lifts and shuttles), per `docs/design/features/moving-objects.md`
 * "Readability". Pure; no Phaser; render-only. Owner: art-director.
 *
 * A slab is built from 16 x 16 segments, one per tile of its width (2-8): `L` (left end), `M`
 * (middle), `R` (right end), plus `S` (a single tile). Every segment has a wide, lit **top lip**
 * (rows 0-2, the only solid face), a body below it that carries the band's pattern (blue stripes,
 * green dots, yellow chevrons, red checker; the safe slab has rivets and no pattern), and an
 * underside rail. That T profile is what separates a slab from a static tile, in
 * colour and in greyscale. The `ghost` state is the slab that will not hold the player right now
 * (the "sink" look): no fill, dashed outline, hollow pattern, no lit lip, and three flat
 * sink dashes under it.
 *
 * Direction chevrons (8 x 8 white masks) and the track (dotted line, corners, end stops; white
 * masks, tint at runtime) are separate frames, so the scene can place them from the slab's delta.
 */
import type { BandColor } from '../../core/types';
import { hexToRgb, mix, type Rgb } from '../color';
import { palette, patternOf } from '../palette';
import { pixelPatternOn } from '../patterns';
import { bayer, createRaster, fillRect, rgba, setPixel, type Raster, type Rgba } from './raster';

export const SLAB_SIZE = 16;
/** Slab kinds in sheet order: grey `safe`, then the four coloured bands (white slabs are Could, not baked). */
export const SLAB_KINDS = ['safe', 'blue', 'green', 'yellow', 'red'] as const;
export type SlabKind = (typeof SLAB_KINDS)[number];
export const SLAB_SEGMENTS = ['L', 'M', 'R', 'S'] as const;
export type SlabSegment = (typeof SLAB_SEGMENTS)[number];
export const SLAB_STATES = ['solid', 'ghost'] as const;
export type SlabState = (typeof SLAB_STATES)[number];

export const DIRS = ['l', 'r', 'u', 'd'] as const;
export type Dir = (typeof DIRS)[number];

export const CHEVRON_SIZE = 8;

const WHITE_RGB: Rgb = { r: 255, g: 255, b: 255 };
const WHITE: Rgba = [255, 255, 255, 255];
const bg = (): Rgb => hexToRgb(palette.background);

/** The segments of a slab `width` tiles wide (1 gives `S`; 2-8 give `L`, `M`..., `R`). */
export function slabSegments(width: number): SlabSegment[] {
  if (width <= 1) return ['S'];
  return Array.from({ length: width }, (_, i): SlabSegment => (i === 0 ? 'L' : i === width - 1 ? 'R' : 'M'));
}

interface SlabColors {
  readonly fill: Rgb;
  readonly outline: Rgb;
  readonly ink: Rgb;
}

function slabColors(kind: SlabKind, state: SlabState): SlabColors {
  if (kind === 'safe') {
    const f = hexToRgb(palette.safeTile.fill);
    return { fill: f, outline: hexToRgb(palette.safeTile.outline), ink: mix(f, bg(), palette.pixel.safeRivetMix) };
  }
  const g = palette.gears[kind as BandColor][state];
  return { fill: hexToRgb(g.fill), outline: hexToRgb(g.outline), ink: hexToRgb(g.ink) };
}

const patternFor = (kind: SlabKind): ReturnType<typeof patternOf> => (kind === 'safe' ? 'plain' : patternOf(kind as BandColor));
const isLeft = (s: SlabSegment): boolean => s === 'L' || s === 'S';
const isRight = (s: SlabSegment): boolean => s === 'R' || s === 'S';

function bakeSolidSlab(kind: SlabKind, seg: SlabSegment): Raster {
  const r = createRaster(SLAB_SIZE, SLAB_SIZE);
  const { fill, outline, ink } = slabColors(kind, 'solid');
  const out = rgba(outline);
  const dark = rgba(mix(fill, bg(), palette.pixel.shadeMix));
  fillRect(r, 0, 3, SLAB_SIZE, 9, rgba(fill)); // body, rows 3-11
  fillRect(r, 0, 0, SLAB_SIZE, 3, rgba(mix(fill, WHITE_RGB, palette.pixel.lipMix))); // lip, rows 0-2
  fillRect(r, 0, 0, SLAB_SIZE, 1, out);
  fillRect(r, 0, 3, SLAB_SIZE, 1, rgba(mix(fill, bg(), palette.pixel.solidSeamMix))); // seam under the lip
  fillRect(r, 0, 10, SLAB_SIZE, 1, dark);
  fillRect(r, 0, 11, SLAB_SIZE, 1, out); // body underline
  const id = patternFor(kind);
  for (let j = 0; j < 6; j++) {
    for (let i = 0; i < SLAB_SIZE; i++) if (pixelPatternOn(id, i, j, SLAB_SIZE)) setPixel(r, i, 4 + j, rgba(ink));
  }
  if (kind === 'safe') for (const x of [3, 12]) for (const y of [5, 8]) setPixel(r, x, y, rgba(ink));
  // Underside rail: a flat bar (no teeth: nothing harmless may look like a spike), so the slab hangs from a rail.
  fillRect(r, 1, 12, 14, 2, dark);
  fillRect(r, 1, 14, 14, 1, out);
  if (isLeft(seg)) fillRect(r, 0, 0, 1, 12, out);
  if (isRight(seg)) fillRect(r, SLAB_SIZE - 1, 0, 1, 12, out);
  return r;
}

function bakeGhostSlab(kind: SlabKind, seg: SlabSegment): Raster {
  const r = createRaster(SLAB_SIZE, SLAB_SIZE);
  const { fill, outline, ink } = slabColors(kind, 'ghost');
  const wash = rgba(fill, Math.round(255 * palette.pixel.ghostWashMix));
  for (let j = 3; j < 12; j++) {
    for (let i = 0; i < SLAB_SIZE; i++) if (((i + j) & 3) === 0 && bayer(i, j) < 0.5) setPixel(r, i, j, wash);
  }
  const id = patternFor(kind);
  const on = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < SLAB_SIZE && j < 6 && pixelPatternOn(id, i, j, SLAB_SIZE);
  for (let j = 0; j < 6; j++) {
    for (let i = 0; i < SLAB_SIZE; i++) {
      const rim = !on(i - 1, j) || !on(i + 1, j) || !on(i, j - 1) || !on(i, j + 1);
      if (on(i, j) && rim) setPixel(r, i, 4 + j, rgba(ink));
    }
  }
  const [dashOn = 3, dashOff = 2] = palette.pixel.ghostDash;
  const line = rgba(outline);
  for (let i = 0; i < SLAB_SIZE; i++) {
    if (i % (dashOn + dashOff) >= dashOn) continue;
    setPixel(r, i, 0, line); // dashed top: a ghost lip is a line, not a lit bar
    setPixel(r, i, 11, line);
  }
  if (isLeft(seg)) for (let y = 0; y < 12; y += 2) setPixel(r, 0, y, line);
  if (isRight(seg)) for (let y = 0; y < 12; y += 2) setPixel(r, SLAB_SIZE - 1, y, line);
  // Sink marks: three short horizontal dashes under the slab (flat, never pointed: nothing harmless looks like a spike).
  for (const x0 of [1, 6, 11]) for (let i = 0; i < 4; i++) setPixel(r, x0 + i, 12, line);
  return r;
}

/** One 16 x 16 slab segment, origin (0, 0): top-left of the tile, lip on the tile's top edge. */
export function bakeSlabSegment(kind: SlabKind, seg: SlabSegment, state: SlabState): Raster {
  return state === 'solid' ? bakeSolidSlab(kind, seg) : bakeGhostSlab(kind, seg);
}

/** Turn a canonical "facing right" point in a `size` x `size` cell to face `dir`. Pure coordinate maths. */
export function turnPoint(dir: Dir, x: number, y: number, size: number): readonly [number, number] {
  const m = size - 1;
  if (dir === 'r') return [x, y];
  if (dir === 'l') return [m - x, y];
  if (dir === 'd') return [m - y, x];
  return [y, m - x];
}

const CHEVRON_RIGHT = ['##......', '.##.....', '..##....', '...##...', '...##...', '..##....', '.##.....', '##......'] as const;

/** A direction chevron, 8 x 8 white mask, origin (0.5, 0.5): draw it on the side of the slab it moves toward. */
export function bakeChevron(dir: Dir): Raster {
  const r = createRaster(CHEVRON_SIZE, CHEVRON_SIZE);
  CHEVRON_RIGHT.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue;
      const [tx, ty] = turnPoint(dir, x, y, CHEVRON_SIZE);
      setPixel(r, tx, ty, WHITE);
    }
  });
  return r;
}

export const TRACK_CELLS = ['h', 'v', 'ne', 'nw', 'se', 'sw', 'stop/l', 'stop/r', 'stop/u', 'stop/d'] as const;
export type TrackCell = (typeof TRACK_CELLS)[number];

type Side = 'n' | 'e' | 's' | 'w';
const CELL_SIDES: Readonly<Record<TrackCell, readonly Side[]>> = {
  h: ['e', 'w'], v: ['n', 's'], ne: ['n', 'e'], nw: ['n', 'w'], se: ['s', 'e'], sw: ['s', 'w'],
  'stop/l': ['e'], 'stop/r': ['w'], 'stop/u': ['s'], 'stop/d': ['n'],
};

/**
 * One 16 x 16 track cell, white mask, origin (0, 0): a dotted line (2 px dots, 2 px gaps, 2 px
 * thick) from the cell centre to each connected side; `ne` joins north and east, and so on.
 * `stop/<side>` is a path end: a bar on that side of the cell and the line leading away from it.
 * The track is drawn in every effects mode; it is the plan of the puzzle.
 */
export function bakeTrackCell(cell: TrackCell): Raster {
  const r = createRaster(SLAB_SIZE, SLAB_SIZE);
  fillRect(r, 7, 7, 2, 2, WHITE); // the joint
  for (const side of CELL_SIDES[cell]) {
    for (let a = 0; a < 8; a++) {
      const along = side === 'e' || side === 's' ? 8 + a : a;
      if (along % 4 >= 2) continue;
      if (side === 'e' || side === 'w') fillRect(r, along, 7, 1, 2, WHITE);
      else fillRect(r, 7, along, 2, 1, WHITE);
    }
  }
  if (cell === 'stop/l') fillRect(r, 0, 3, 2, 10, WHITE);
  if (cell === 'stop/r') fillRect(r, 14, 3, 2, 10, WHITE);
  if (cell === 'stop/u') fillRect(r, 3, 0, 10, 2, WHITE);
  if (cell === 'stop/d') fillRect(r, 3, 14, 10, 2, WHITE);
  return r;
}
