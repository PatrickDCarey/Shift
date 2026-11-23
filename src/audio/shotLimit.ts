// Rate limit for the emitter shot cue. Owner: audio-designer. Pure but for the injected clock.
// A room of launchers must stay a texture, not noise: one cue per gap, a few per window.

/** Minimum milliseconds between two shot cues. */
export const SHOT_MIN_GAP_MS = 90;
/** At most this many shot cues inside any SHOT_WINDOW_MS. */
export const SHOT_BURST_MAX = 3;
export const SHOT_WINDOW_MS = 600;

const wallClock = (): number => (typeof performance === 'undefined' ? 0 : performance.now());

/** Returns `allow()`: true (and records the cue) when a shot cue may play now. */
export function createShotLimiter(now: () => number = wallClock): () => boolean {
  let recent: number[] = [];
  return () => {
    const t = now();
    recent = recent.filter((at) => t - at < SHOT_WINDOW_MS && t >= at);
    const last = recent[recent.length - 1];
    if (last !== undefined && t - last < SHOT_MIN_GAP_MS) return false;
    if (recent.length >= SHOT_BURST_MAX) return false;
    recent.push(t);
    return true;
  };
}
