/**
 * Timing maths for render-only feedback (flashes, ring bursts). Pure.
 * Effects never feed back into the sim.
 *
 * Owner: gameplay-engineer [scene].
 */

/** docs/art/style.md: never flash more than 3 times per second. */
export const MAX_FLASHES_PER_SECOND = 3;

/** Linear fade from `peak` to 0 over `durationMs`. */
export function flashAlpha(peak: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0 || elapsedMs >= durationMs) return 0;
  return peak * (1 - Math.max(0, elapsedMs) / durationMs);
}

/** Progress 0..1 of a timed effect, or null once it has finished. */
export function effectProgress(elapsedMs: number, durationMs: number): number | null {
  if (durationMs <= 0 || elapsedMs >= durationMs) return null;
  return Math.max(0, elapsedMs) / durationMs;
}

/** True if a new full-screen flash may start now (`lastAtMs` null = never flashed). */
export function flashAllowed(lastAtMs: number | null, nowMs: number, maxPerSecond = MAX_FLASHES_PER_SECOND): boolean {
  return lastAtMs === null || nowMs - lastAtMs >= 1000 / maxPerSecond;
}
