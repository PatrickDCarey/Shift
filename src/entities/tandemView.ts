/**
 * Pure scene maths for Tandem (docs/design/features/tandem.md, "Camera framing"
 * and "Readability"): the edge arrow's placement, the two compact HUD strips,
 * which lane a tile row belongs to. No Phaser, so S1-S4 are unit-testable.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { Level } from '../core/types';
import { EDGE_ARROW_H, EDGE_ARROW_W } from '../fx/pixel';
import { cameraFocus, type CameraBody } from './camera';

/** Bodies further apart than this many tiles are not framed together (tandem.md). */
export const MAX_APART_TILES = 28;

const MARGIN = 5;
/** Below the two compact strips (they end at y 35). */
const ARROW_TOP = 40;
const ARROW_BOTTOM_MARGIN = 8;

/** Two compact strips, top-left, runner on top (tandem.md "Readability"). 110 x 14 each. */
export const TANDEM_STRIPS = {
  runner: { x: MARGIN, y: MARGIN },
  twin: { x: MARGIN, y: MARGIN + 14 + 2 },
} as const;

export interface EdgeArrow {
  /** Screen x of the sprite's left edge (sprite origin is (0, 0.5)). */
  readonly x: number;
  /** Screen y of the arrow's centre. */
  readonly y: number;
  /** True at the left edge: the right-pointing frame is mirrored. */
  readonly flipX: boolean;
}

/**
 * Where to draw the edge arrow for a body, or null when the body is on screen.
 * `scrollX`/`scrollY` are the camera scroll; `feetPx` the body's feet in world px.
 * The arrow hugs the edge nearest the body and follows its height, kept clear of the HUD.
 */
export function edgeArrowPlacement(
  feetPx: { readonly px: number; readonly py: number },
  bodyHeightPx: number,
  scroll: { readonly x: number; readonly y: number },
  view: { readonly w: number; readonly h: number },
): EdgeArrow | null {
  const sx = feetPx.px - scroll.x;
  if (sx >= 0 && sx <= view.w) return null;
  const left = sx < 0;
  const centreY = feetPx.py - Math.floor(bodyHeightPx / 2) - scroll.y;
  const lo = ARROW_TOP + EDGE_ARROW_H / 2;
  const hi = view.h - ARROW_BOTTOM_MARGIN - EDGE_ARROW_H / 2;
  return {
    x: left ? MARGIN : view.w - MARGIN - EDGE_ARROW_W,
    y: Math.round(Math.min(Math.max(centreY, lo), hi)),
    flipX: left,
  };
}

/**
 * Whether a tile row belongs to the twin's lane (true) or the runner's (false).
 * Lanes are stacked, so a row belongs to the body whose start row is nearer; ties
 * go to the runner (the divider). Null for a level without a twin, and for a shared
 * room (start rows closer than 3), where the runner's colour drives every tile.
 */
export function twinLaneTest(level: Level): ((row: number) => boolean) | null {
  if (level.twinStart === null) return null;
  const a = level.start.row;
  const b = level.twinStart.row;
  if (Math.abs(a - b) < 3) return null;
  return (row) => Math.abs(row - b) < Math.abs(row - a);
}

export interface TandemCamera {
  readonly x: number;
  readonly y: number;
  /** Index of the body to point an edge arrow at, or null. */
  readonly edgeBody: number | null;
}

/** The camera focus for the bodies (runner first); thin wrapper that applies the 28-tile rule. */
export function tandemCamera(bodies: readonly CameraBody[], bodyHeightPx: number, tileSize: number): TandemCamera | null {
  return cameraFocus(bodies, bodyHeightPx, MAX_APART_TILES * tileSize);
}
