/**
 * Tile bakers for direction C: 16 x 16 px safe tiles (with a lit top lip and
 * dithered depth), solid and ghost colored tiles per band, the exit door and
 * its glow. Neighbour-aware: an edge is outlined only when the neighbour on
 * that side is not the same kind. Pure; no Phaser. Owner: art-director.
 */
import type { BandColor } from '../../core/types';
import { hexToRgb, mix, type Rgb } from '../color';
import { palette, patternOf } from '../palette';
import { PIXEL_CELLS, pixelPatternOn } from '../patterns';
import { bayer, createRaster, fillRect, rgba, setPixel, type Raster } from './raster';

/** Tile edge in pixels, from `palette.pixel.tileSize` (16). */
export const TILE = palette.pixel.tileSize;
/** Pattern cell origin inside a tile (12 x 10 px, below the lip). */
const PAT_X = 2;
const PAT_Y = 4;

/** Which neighbours are the same kind of tile (so that edge is not outlined). */
export interface Neighbours {
  readonly up: boolean;
  readonly right: boolean;
  readonly down: boolean;
  readonly left: boolean;
}

export const NEIGHBOUR_MASKS = 16;

/** Neighbour mask: bit 0 up, 1 right, 2 down, 3 left. */
export function neighbourMask(n: Neighbours): number {
  return (n.up ? 1 : 0) | (n.right ? 2 : 0) | (n.down ? 4 : 0) | (n.left ? 8 : 0);
}

export function neighboursOf(mask: number): Neighbours {
  return { up: (mask & 1) !== 0, right: (mask & 2) !== 0, down: (mask & 4) !== 0, left: (mask & 8) !== 0 };
}

/** Number of dither depth levels for safe tiles (0 = surface). */
export const SAFE_DEPTHS = 5;

const bg = (): Rgb => hexToRgb(palette.background);
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

function outlineEdges(r: Raster, n: Neighbours, color: Rgb, bottomAlways: boolean): void {
  const c = rgba(color);
  if (!n.up) fillRect(r, 0, 0, TILE, 1, c);
  if (!n.left) fillRect(r, 0, 0, 1, TILE, c);
  if (!n.right) fillRect(r, TILE - 1, 0, 1, TILE, c);
  if (!n.down || bottomAlways) fillRect(r, 0, TILE - 1, TILE, 1, c);
}

/** The always-solid safe tile: grey, lit top lip when the top is exposed, dithered darker with depth. */
export function bakeSafeTile(n: Neighbours, depth: number): Raster {
  const r = createRaster(TILE, TILE);
  const f = hexToRgb(palette.safeTile.fill);
  fillRect(r, 0, 0, TILE, TILE, rgba(f));
  const dark = rgba(mix(f, bg(), palette.pixel.safeDepthMix));
  for (let j = 0; j < TILE; j++) {
    for (let i = 0; i < TILE; i++) if (bayer(i, j) < 0.14 * depth) setPixel(r, i, j, dark);
  }
  const rivet = rgba(mix(f, bg(), palette.pixel.safeRivetMix));
  for (const [i, j] of [[2, 2], [TILE - 3, 2], [2, TILE - 3], [TILE - 3, TILE - 3]] as const) setPixel(r, i, j, rivet);
  if (!n.up) fillRect(r, 0, 1, TILE, 1, rgba(mix(f, WHITE, palette.pixel.safeLipMix)));
  outlineEdges(r, n, hexToRgb(palette.safeTile.outline), false);
  return r;
}

/** A band-colored tile you can stand on: fill, lit flat top edge, ink pattern, light outline. */
export function bakeSolidTile(band: BandColor, n: Neighbours): Raster {
  const r = createRaster(TILE, TILE);
  const s = palette.gears[band].solid;
  const fill = hexToRgb(s.fill);
  const p = PIXEL_CELLS.tile;
  fillRect(r, 0, 0, TILE, TILE, rgba(fill));
  fillRect(r, 0, TILE - 2, TILE, 2, rgba(mix(fill, bg(), palette.pixel.shadeMix)));
  const ink = rgba(hexToRgb(s.ink));
  const id = patternOf(band);
  for (let j = 0; j < p.height; j++) {
    for (let i = 0; i < p.width; i++) if (pixelPatternOn(id, i, j, p.width)) setPixel(r, PAT_X + i, PAT_Y + j, ink);
  }
  fillRect(r, 0, 1, TILE, 2, rgba(mix(fill, WHITE, palette.pixel.lipMix)));
  fillRect(r, 0, 3, TILE, 1, rgba(mix(fill, bg(), palette.pixel.solidSeamMix)));
  if (n.left) fillRect(r, 0, 4, 1, TILE - 5, rgba(mix(fill, bg(), palette.pixel.solidSideMix)));
  outlineEdges(r, n, hexToRgb(s.outline), true);
  return r;
}

/**
 * A band-colored tile you would fall through: no fill (a faint dithered wash
 * through transparency), hollow ghost-colored pattern marks, 1 px dashed outline with
 * solid corners. Never glows, never has a lit lip.
 */
export function bakeGhostTile(band: BandColor): Raster {
  const r = createRaster(TILE, TILE);
  const g = palette.gears[band].ghost;
  const wash = rgba(hexToRgb(g.fill), Math.round(255 * palette.pixel.ghostWashMix));
  for (let j = 0; j < TILE; j++) {
    for (let i = 0; i < TILE; i++) if (((i + j) & 3) === 0 && bayer(i, j) < 0.5) setPixel(r, i, j, wash);
  }
  const p = PIXEL_CELLS.tile;
  const id = patternOf(band);
  const ink = rgba(hexToRgb(g.ink));
  const inkAt = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < p.width && j < p.height && pixelPatternOn(id, i, j, p.width);
  for (let j = 0; j < p.height; j++) {
    for (let i = 0; i < p.width; i++) {
      // Hollow marks: only the rim of each mark, so a ghost stays lighter than a solid.
      const rim = !inkAt(i - 1, j) || !inkAt(i + 1, j) || !inkAt(i, j - 1) || !inkAt(i, j + 1);
      if (inkAt(i, j) && rim) setPixel(r, PAT_X + i, PAT_Y + j, ink);
    }
  }
  const [on = 3, off = 2] = palette.pixel.ghostDash;
  const line = rgba(hexToRgb(g.outline));
  for (let i = 0; i < TILE; i++) {
    const dash = i % (on + off) < on || i < on || i > TILE - 1 - on;
    if (!dash) continue;
    setPixel(r, i, 0, line);
    setPixel(r, i, TILE - 1, line);
    setPixel(r, 0, i, line);
    setPixel(r, TILE - 1, i, line);
  }
  return r;
}

export const EXIT_FRAMES = 4;
const SPARKLE_ARMS = [1, 2, 2, 1] as const;

/** The exit door (one tile): white frame, dark doorway, a pulsing four-point sparkle. Pure white, used by nothing else. */
export function bakeExitDoor(frame: number): Raster {
  const r = createRaster(TILE, TILE);
  const e = palette.pixel.exit;
  const white = rgba(hexToRgb(e.frame));
  fillRect(r, 2, 1, 12, 15, white);
  fillRect(r, 3, 0, 10, 1, white);
  fillRect(r, 4, 3, 8, 13, rgba(hexToRgb(e.doorway)));
  const arms = SPARKLE_ARMS[frame % EXIT_FRAMES] ?? 1;
  setPixel(r, 8, 10, white);
  for (let k = 1; k <= arms; k++) {
    for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]] as const) setPixel(r, 8 + dx, 10 + dy, white);
  }
  return r;
}

export const GLOW_SIZE = 32;

/** Dithered halo behind the exit, 32 x 32, centred on the door tile; stays within 8 px above and below the tile. */
export function bakeExitGlow(frame: number): Raster {
  const r = createRaster(GLOW_SIZE, GLOW_SIZE);
  const c = rgba(hexToRgb(palette.pixel.exit.glow), 120);
  const cx = GLOW_SIZE / 2;
  const cy = GLOW_SIZE / 2;
  const radius = 12 + 1.5 * (SPARKLE_ARMS[frame % EXIT_FRAMES] ?? 1);
  for (let j = -TILE / 2; j < TILE / 2; j++) {
    for (let i = -12; i <= 12; i++) {
      const d = Math.hypot(i * 0.8, j) / radius;
      if (d < 1 && bayer(cx + i, cy + j) < (1 - d) * 1.15) setPixel(r, cx + i, cy + j, c);
    }
  }
  return r;
}
