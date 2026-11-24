/**
 * Checkpoint post sprites (long levels), per `docs/design/features/checkpoints.md` "Readability".
 * Pure; no Phaser; render-only. Owner: art-director. Atlas `pixel-kinetics`.
 *
 * Every frame is 16 x 24 px (one tile wide, 1.5 tall), origin (0.5, 1): the bottom centre, which
 * is the middle of the base plate. Place it at x = (col + 0.5) * 16, y = the floor's top edge.
 * Both poles are two columns wide (x 7-8, centred on x = 8), so the origin never sits between pixels.
 *
 *  - `checkpoint/idle`: unlit, neutral grey (never a gear colour). A 2 px pole under an 8 x 8 square
 *    lamp: 2 px outline in the safe-tile edge colour, dim safe-tile fill inside, and a 1 px dark rim
 *    (the background colour) around pole and lamp so it separates from the backdrop.
 *  - `checkpoint/lit`:  lit. A 2 px pole, a ball on top and a FILLED pennant flag pointing
 *    right. A box lamp versus a flag is a different silhouette, so the state reads in greyscale.
 *  - `checkpoint/rise/<0-2>`: the lit transition (3 frames, ~60 ms each): the pennant climbs the
 *    pole; the last step is `lit`. Reduced motion: skip these and show `lit` (static).
 */
import { hexToRgb } from '../color';
import { palette } from '../palette';
import { createRaster, fillRect, rgba, setPixel, type Raster } from './raster';

export const POST_W = 16;
export const POST_H = 24;
export const POST_RISE_FRAMES = 3;
export const POST_ORIGIN = { x: 0.5, y: 1 } as const;
export type PostState = 'idle' | 'lit';

const FLAG_TOP_LIT = 2;
const FLAG_H = 9;
/** Pennant top row per rise frame (lit is 2): it climbs 12, 8, then 4 px below its final spot. */
const RISE_OFFSET = [12, 8, 4] as const;

export function postFrameNames(): { idle: string; lit: string; rise: (n: number) => string } {
  return { idle: 'checkpoint/idle', lit: 'checkpoint/lit', rise: (n) => `checkpoint/rise/${n}` };
}

/** Base plate: solid safe-tile fill with a bright top edge, the same in both states (it is the ground contact). */
function drawBase(r: Raster): void {
  fillRect(r, 4, 22, 8, 2, rgba(hexToRgb(palette.safeTile.fill)));
  fillRect(r, 4, 22, 8, 1, rgba(hexToRgb(palette.safeTile.outline)));
}

function drawPennant(r: Raster, top: number): void {
  const c = rgba(hexToRgb(palette.ui.text));
  for (let j = 0; j < FLAG_H; j++) {
    const w = Math.max(1, 7 - Math.round(Math.abs(j - 4) * 1.5));
    for (let i = 0; i < w; i++) setPixel(r, 9 + i, top + j, c);
  }
}

function bakeIdle(): Raster {
  const r = createRaster(POST_W, POST_H);
  const edge = rgba(hexToRgb(palette.safeTile.outline));
  const dim = rgba(hexToRgb(palette.safeTile.fill));
  const rim = rgba(hexToRgb(palette.background));
  drawBase(r);
  fillRect(r, 6, 9, 4, 13, rim);
  fillRect(r, 3, 0, 10, 10, rim);
  fillRect(r, 7, 9, 2, 13, edge);
  fillRect(r, 4, 1, 8, 8, edge);
  fillRect(r, 6, 3, 4, 4, dim);
  return r;
}

function bakePole(top: number, ball: boolean, flagTop: number): Raster {
  const r = createRaster(POST_W, POST_H);
  drawBase(r);
  fillRect(r, 7, top, 2, 22 - top, rgba(hexToRgb(palette.safeTile.outline)));
  if (ball) fillRect(r, 6, 0, 4, 2, rgba(hexToRgb(palette.ui.text)));
  drawPennant(r, flagTop);
  return r;
}

/** `lit` is the final frame; `rise` frames 0..2 climb to it. */
export function bakePost(state: PostState): Raster {
  return state === 'idle' ? bakeIdle() : bakePole(2, true, FLAG_TOP_LIT);
}

export function bakePostRise(frame: number): Raster {
  const f = Math.min(Math.max(Math.trunc(frame), 0), POST_RISE_FRAMES - 1);
  return bakePole(2, false, FLAG_TOP_LIT + RISE_OFFSET[f]!);
}
