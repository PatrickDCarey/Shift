/**
 * Sweep sprites (the advancing front), per `docs/design/features/sweep.md` "Readability". Pure; no
 * Phaser; render-only. Owner: art-director. Atlas `pixel-kinetics`. All frames are pure #FFFFFF
 * masks (tint at runtime): no band colour, no band pattern, so it is never read as a gear.
 *
 *  - `sweep/edge/<0-2>`: 16 x 16, origin (0, 0). The hard front edge: a 2 px bright bar on the
 *    RIGHT side (x 14-15) with a saw-tooth ragged left side 0-3 px deep (teeth pointing into the
 *    swept area). Tile it vertically every 16 px to cover the view (270 px = 17 tiles). Place the
 *    tile column at x = frontPx - 16, so the bar's right edge is exactly the front. The saw period
 *    is 8 px, so any vertical tiling is seamless. 3 frames cycle at about 8 fps (the teeth crawl);
 *    reduced motion: frame 0 only.
 *  - `sweep/fill/<0-3>`: 16 x 16, origin (0, 0). The swept area: a thin 45-degree hatch (one pixel
 *    in four, so geometry underneath stays readable). Tile both ways from the view's left edge up
 *    to `frontPx - 16`; draw under bodies. 4 frames scroll the hatch one pixel each (about 6 fps);
 *    reduced motion: frame 0 only. Suggested tint: `ui.textMuted` at low alpha.
 *  - `sweep/marker`: 12 x 16, origin (0, 0.5). A left-pointing arrowhead for the left screen edge
 *    while the front is off screen left. The gap bar (up to 15 tiles) is a plain rectangle the scene
 *    draws beside it; not baked.
 *  Greyscale is inherent: a saw-tooth edge plus a diagonal hatch, shape only.
 */
import { createRaster, setPixel, type Raster, type Rgba } from './raster';

export const SWEEP_TILE = 16;
export const SWEEP_EDGE_FRAMES = 3;
export const SWEEP_FILL_FRAMES = 4;
export const SWEEP_MARKER_W = 12;
export const SWEEP_MARKER_H = 16;
export const SWEEP_MARKER_ORIGIN = { x: 0, y: 0.5 } as const;
export const SWEEP_TILE_ORIGIN = { x: 0, y: 0 } as const;

const WHITE: Rgba = [255, 255, 255, 255];
const SAW_PERIOD = 8;

export function sweepFrameNames(): { edge: (n: number) => string; fill: (n: number) => string; marker: string } {
  return { edge: (n) => `sweep/edge/${n}`, fill: (n) => `sweep/fill/${n}`, marker: 'sweep/marker' };
}

const clampFrame = (f: number, n: number): number => Math.min(Math.max(Math.trunc(f), 0), n - 1);

export function bakeSweepEdge(frame: number): Raster {
  const f = clampFrame(frame, SWEEP_EDGE_FRAMES);
  const r = createRaster(SWEEP_TILE, SWEEP_TILE);
  const shift = Math.round((f * SAW_PERIOD) / SWEEP_EDGE_FRAMES);
  for (let y = 0; y < SWEEP_TILE; y++) {
    const d = (y + shift) % SAW_PERIOD;
    const depth = d < 4 ? d : 7 - d;
    for (let x = 14 - depth; x <= 15; x++) setPixel(r, x, y, WHITE);
  }
  return r;
}

export function bakeSweepFill(frame: number): Raster {
  const f = clampFrame(frame, SWEEP_FILL_FRAMES);
  const r = createRaster(SWEEP_TILE, SWEEP_TILE);
  for (let y = 0; y < SWEEP_TILE; y++) {
    for (let x = 0; x < SWEEP_TILE; x++) if ((x + y + f) % 4 === 0) setPixel(r, x, y, WHITE);
  }
  return r;
}

/** Arrowhead pointing left: row y spans x from |y - 7.5| (rounded) for 4 px; the tip is at x 0. */
export function bakeSweepMarker(): Raster {
  const r = createRaster(SWEEP_MARKER_W, SWEEP_MARKER_H);
  for (let y = 0; y < SWEEP_MARKER_H; y++) {
    const left = Math.floor(Math.abs(y - 7.5));
    for (let x = left; x < left + 4 && x < SWEEP_MARKER_W; x++) setPixel(r, x, y, WHITE);
  }
  return r;
}
