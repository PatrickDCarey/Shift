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
