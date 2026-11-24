/**
 * Pure layout of the sweep (sweep.md "Readability"): the front's blended position, the hard-edge column,
 * the hatched fill behind it, and the off-screen-left marker with its gap bar. Position is
 * `sweepFront(sw, t, width)` at the kinetic clock, blended across consecutive steps like the slabs.
 * Phaser-free. Owner: gameplay-engineer [scene].
 */
import { sweepFront } from '../core';
import type { SimState, Sweep } from '../core/types';
import { SWEEP_EDGE_FRAMES, SWEEP_FILL_FRAMES } from '../fx';
import { lerp } from './interpolation';
import { renderTime } from './kineticsPlan';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface SweepLayout {
  /** The 16 px front column at x = frontPx - 16, tiled vertically; null when it is off screen. */
  readonly edge: Rect | null;
  /** The swept area from the view's left edge to the edge column; null when empty. */
  readonly fill: Rect | null;
  /** Set while the front is off screen to the left: the gap in tiles (capped for the bar). */
  readonly markerGapTiles: number | null;
}

/** Tile size of the sweep frames (px). */
const T = 16;
/** Longest gap the marker bar shows (sweep.md: up to 15 tiles). */
export const MAX_GAP_TILES = 15;
/** Teeth crawl about 8 fps; the hatch scrolls about 6 fps (docs/art/kinetics.md). */
const EDGE_MS = 125;
const FILL_MS = 166;

export function sweepFrontTiles(sw: Sweep, prev: SimState, state: SimState, alpha: number, levelWidth: number): number {
  const t = renderTime(prev, state, alpha);
  return lerp(sweepFront(sw, t.t0, levelWidth), sweepFront(sw, t.t1, levelWidth), t.a);
}

/** Frame index of an animated sweep part; reduced motion holds frame 0. */
export function sweepFrame(timeMs: number, reduced: boolean, frames: number, periodMs: number): number {
  return reduced ? 0 : Math.floor(timeMs / periodMs) % frames;
}
export const edgeFrame = (timeMs: number, reduced: boolean): number => sweepFrame(timeMs, reduced, SWEEP_EDGE_FRAMES, EDGE_MS);
export const fillFrame = (timeMs: number, reduced: boolean): number => sweepFrame(timeMs, reduced, SWEEP_FILL_FRAMES, FILL_MS);

/** Where the sweep parts go for a camera view (world px) and a front (tiles). Rows get one tile of margin. */
export function sweepLayout(frontTiles: number, view: Rect, tileSize = T): SweepLayout {
  const frontPx = Math.round(frontTiles * tileSize);
  if (frontPx <= view.x) {
    return { edge: null, fill: null, markerGapTiles: Math.min(MAX_GAP_TILES, (view.x - frontPx) / tileSize) };
  }
  const top = Math.floor(view.y / T) * T - T;
  const h = Math.ceil((view.y + view.h - top) / T) * T + T;
  const edgeX = frontPx - T;
  const left = Math.floor(view.x / T) * T - T;
  const right = Math.min(edgeX, view.x + view.w + T);
  return {
    edge: edgeX < view.x + view.w + T ? { x: edgeX, y: top, w: T, h } : null,
    fill: right > left ? { x: left, y: top, w: right - left, h } : null,
    markerGapTiles: null,
  };
}
