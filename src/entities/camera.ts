/**
 * Camera maths: follow the player, never show outside the level, centre a
 * level smaller than the view. Pure; units are pixels.
 *
 * Owner: gameplay-engineer [scene].
 */

/** Scroll for one axis: `focus` centred in the view, clamped to the world. */
export function axisScroll(focus: number, viewSize: number, worldSize: number): number {
  if (worldSize <= viewSize) return Math.round((worldSize - viewSize) / 2);
  const wanted = focus - viewSize / 2;
  return Math.round(Math.min(Math.max(wanted, 0), worldSize - viewSize));
}

export interface Scroll {
  readonly x: number;
  readonly y: number;
}

export function cameraScroll(
  focusX: number,
  focusY: number,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
): Scroll {
  return { x: axisScroll(focusX, viewW, worldW), y: axisScroll(focusY, viewH, worldH) };
}

/** A body's feet in whole screen-space world pixels, already snapped, plus its home flag. */
export interface CameraBody {
  readonly px: number;
  readonly py: number;
  readonly home: boolean;
}

/** Feet position in tiles to whole pixels. Round here, once, and derive everything else from the result. */
export function snapFeet(xTiles: number, yTiles: number, tileSize: number): { readonly px: number; readonly py: number } {
  return { px: Math.round(xTiles * tileSize), py: Math.round(yTiles * tileSize) };
}

export interface CameraFocus {
  readonly x: number;
  readonly y: number;
  /** Index of a body that is off-screen and needs an edge arrow, or null. */
  readonly edgeBody: number | null;
}

/**
 * Where the camera looks, from the snapped bodies (runner first). Integer in,
 * integer out, so a body's screen position never differs by a rounding step
 * from the camera's. One body or one home: that body. Two active bodies within
 * `maxApartPx`: the integer midpoint. Further apart: the runner, and the twin gets
 * an edge arrow. All home: null (keep the last scroll).
 */
export function cameraFocus(bodies: readonly CameraBody[], bodyHeightPx: number, maxApartPx: number): CameraFocus | null {
  const active = bodies.map((b, i) => ({ b, i })).filter(({ b }) => !b.home);
  const half = Math.floor(bodyHeightPx / 2);
  const [first, second] = active;
  if (first === undefined) return null;
  if (second === undefined) return { x: first.b.px, y: first.b.py - half, edgeBody: null };
  if (Math.abs(first.b.px - second.b.px) > maxApartPx) return { x: first.b.px, y: first.b.py - half, edgeBody: second.i };
  return {
    x: Math.floor((first.b.px + second.b.px) / 2),
    y: Math.floor((first.b.py + second.b.py) / 2) - half,
    edgeBody: null,
  };
}
