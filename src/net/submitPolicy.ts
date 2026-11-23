// Which runs may be sent to the leaderboard. Pure, no network. Owner: backend-engineer.

/** The server's MAX_RUN_STEPS (backend/functions/submit-run/rules.ts, 10 minutes at 60 Hz). */
export const MAX_RUN_STEPS = 36_000;

/**
 * A recording holds every frame since load, deaths included. The server rejects more than
 * MAX_RUN_STEPS, so longer runs are never sent and the best time stays local. Malformed input
 * is skipped too: a submission problem must never reach the player.
 */
export function shouldSubmitRun(run: unknown): boolean {
  const frames = (run as { solution?: { steps?: unknown } } | null | undefined)?.solution?.steps;
  return typeof frames === 'number' && Number.isInteger(frames) && frames >= 1 && frames <= MAX_RUN_STEPS;
}
