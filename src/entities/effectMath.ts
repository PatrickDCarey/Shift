/**
 * Timing maths for render-only feedback (flashes, ring bursts; the 3-per-second cap is `requestFlash` in src/fx). Pure.
 * Effects never feed back into the sim.
 *
 * Owner: gameplay-engineer [scene].
 */

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
