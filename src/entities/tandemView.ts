/**
 * Pure scene maths for Tandem (docs/design/features/tandem.md, "Camera framing"
 * and "Readability"): the edge arrow's placement, the two compact HUD strips,
 * which lane a tile row belongs to. No Phaser, so S1-S4 are unit-testable.
 *
 * Owner: gameplay-engineer [scene].
 */
import type { Level } from '../core/types';
import { EDGE_ARROW_H, EDGE_ARROW_W } from '../fx/pixel';
import { COMPACT_STRIP_LAYOUT } from '../ui/gearMeterLayout';
import { cameraFocus, type CameraBody } from './camera';

const MARGIN = 5;
const STRIP_GAP = 2;

/** Two compact strips, top-left, runner on top (tandem.md "Readability"). Heights come from the strip layout. */
export const TANDEM_STRIPS = {
  runner: { x: MARGIN, y: MARGIN },
  twin: { x: MARGIN, y: MARGIN + COMPACT_STRIP_LAYOUT.panelH + STRIP_GAP },
} as const;

/** Edge arrows start below the two strips (G5: derived from the strip layout, not a literal). */
export const ARROW_TOP = TANDEM_STRIPS.twin.y + COMPACT_STRIP_LAYOUT.panelH + MARGIN;
export const ARROW_BOTTOM_MARGIN = 8;
export const EDGE_MARGIN = MARGIN;

/**
 * Where to put the sprite (origin (0, 0.5)) so the arrow's 22 px box starts at `arrow.x`.
 * Phaser's `flipX` mirrors the sprite about its position, so a flipped sprite spans
 * `x - 22 .. x`: it must be placed at the box's RIGHT edge or it is cut off at the screen's left.
 */
export function spriteX(arrow: { readonly x: number; readonly flipX: boolean }): number {
  return arrow.flipX ? arrow.x + EDGE_ARROW_W : arrow.x;
}

export interface EdgeArrow {
  /** Screen x of the arrow box's left edge; the sprite's position is `spriteX(arrow)`. */
  readonly x: number;
  /** Screen y of the arrow's centre. */
  readonly y: number;
  /** True at the left edge: the right-pointing frame is mirrored. */
  readonly flipX: boolean;
  /** Degrees about the sprite origin: 0 for left and right edges, 90 (points down) or -90 (points up) for the exit cue. */
  readonly angle: 0 | 90 | -90;
}

/**
 * Where to draw the edge arrow for a body, or null when the body is on screen.
 * `scrollX`/`scrollY` are the camera scroll; `feetPx` the body's feet in world px.
 * The arrow hugs the edge nearest the body and follows its height, kept clear of the HUD.
 *
 * No above/below case (batch 5 G4): `tests/levels/levelRules.test.ts` keeps both Tandem
 * bodies within 15 rows of each other (a 270 px view is 16.9 rows), so a body that is
 * off screen is always off to the left or right, never only above or below.
 * `y` is only the arrow's height along the edge.
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
    angle: 0,
  };
}

/** design-lead's B6-06 ruling (decisions.md 2026-11-16): start rows closer than 3 are one shared room. */
export const SHARED_ROOM_ROWS = 3;

/**
 * Whether a tile row belongs to the twin's lane (true) or the runner's (false).
 * Lanes are stacked, so a row belongs to the body whose start row is nearer; ties
 * go to the runner (the divider). Null for a level without a twin, and for a shared
 * room (start rows closer than `SHARED_ROOM_ROWS`), where the runner's colour drives every tile.
 */
export function twinLaneTest(level: Level): ((row: number) => boolean) | null {
  if (level.twinStart === null) return null;
  const a = level.start.row;
  const b = level.twinStart.row;
  if (Math.abs(a - b) < SHARED_ROOM_ROWS) return null;
  return (row) => Math.abs(row - b) < Math.abs(row - a);
}

export interface TandemCamera {
  readonly x: number;
  readonly y: number;
  /** Index of the body to point an edge arrow at, or null. */
  readonly edgeBody: number | null;
}

/** The camera focus for the bodies (runner first); bodies further apart than `maxApartTiles` (tuning `cameraMaxApartTiles`) are not framed together. */
export function tandemCamera(
  bodies: readonly CameraBody[],
  bodyHeightPx: number,
  tileSize: number,
  maxApartTiles: number,
): TandemCamera | null {
  return cameraFocus(bodies, bodyHeightPx, maxApartTiles * tileSize);
}
