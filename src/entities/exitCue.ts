/**
 * PT-2b: an arrow at the screen edge that points at the exit while no exit is on
 * screen. Pure: which exit, which edge, where along it. Drawn with `hud/edge/exit`
 * (22 x 16, points right, origin (0, 0.5)); the left edge mirrors it, up and down
 * rotate it 90 degrees about the origin.
 *
 * The flipped arrow sits at x = EDGE_MARGIN with its origin (0, 0.5): Phaser's `flipX`
 * mirrors the pixels inside the sprite's own box, so all 22 px stay on screen
 * (art-director, style.md B6-14). Owner: gameplay-engineer [scene].
 */
import { EDGE_ARROW_H, EDGE_ARROW_W } from '../fx/pixel';
import { ARROW_BOTTOM_MARGIN, ARROW_TOP, EDGE_MARGIN, type EdgeArrow } from './tandemView';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface View {
  readonly w: number;
  readonly h: number;
}

/** Top-left HUD block (strips or meter, x 0-120 at y 0-40): a top-edge arrow keeps right of it. */
const HUD_RIGHT = 125;

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

function onScreen(sx: number, sy: number, tileSize: number, view: View): boolean {
  return sx + tileSize > 0 && sx < view.w && sy + tileSize > 0 && sy < view.h;
}

/**
 * Where to draw the exit arrow, or null while any exit tile is (even partly) on screen.
 * `exits` are tile cells; the arrow points at the one nearest the view's centre.
 */
export function exitCue(
  exits: readonly { readonly col: number; readonly row: number }[],
  scroll: Point,
  view: View,
  tileSize: number,
): EdgeArrow | null {
  if (exits.length === 0) return null;
  const centre = { x: scroll.x + view.w / 2, y: scroll.y + view.h / 2 };
  let best = { cx: 0, cy: 0, d: Number.POSITIVE_INFINITY };
  for (const { col, row } of exits) {
    const sx = col * tileSize - scroll.x;
    const sy = row * tileSize - scroll.y;
    if (onScreen(sx, sy, tileSize, view)) return null;
    const cx = col * tileSize + tileSize / 2;
    const cy = row * tileSize + tileSize / 2;
    const d = Math.hypot(cx - centre.x, cy - centre.y);
    if (d < best.d) best = { cx, cy, d };
  }
  return placeCue(best.cx - scroll.x, best.cy - scroll.y, view);
}

/** The arrow for an exit centre at screen (`sx`, `sy`): left/right when it is off sideways, else top/bottom. */
function placeCue(sx: number, sy: number, view: View): EdgeArrow {
  const lo = ARROW_TOP + EDGE_ARROW_H / 2;
  const hi = view.h - ARROW_BOTTOM_MARGIN - EDGE_ARROW_H / 2;
  if (sx < 0 || sx > view.w) {
    const left = sx < 0;
    return {
      x: left ? EDGE_MARGIN : view.w - EDGE_MARGIN - EDGE_ARROW_W,
      y: Math.round(clamp(sy, lo, hi)),
      flipX: left,
      angle: 0,
    };
  }
  // Rotated about the origin (the tail): a down arrow spans y..y+22, an up arrow y-22..y; both are 16 wide, centred on x.
  const x = Math.round(clamp(sx, EDGE_MARGIN + EDGE_ARROW_H / 2, view.w - EDGE_MARGIN - EDGE_ARROW_H / 2));
  if (sy < 0) {
    const keepClear = x < HUD_RIGHT ? Math.max(x, HUD_RIGHT + EDGE_ARROW_H / 2) : x;
    return { x: keepClear, y: EDGE_MARGIN + EDGE_ARROW_W, flipX: false, angle: -90 };
  }
  return { x, y: view.h - EDGE_MARGIN - EDGE_ARROW_W, flipX: false, angle: 90 };
}
