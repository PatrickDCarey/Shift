// Which runs may be sent to the leaderboard. Pure, no network. Owner: backend-engineer.
import type { RunResult } from '../core/types';

/** The server's MAX_RUN_STEPS (backend/functions/submit-run/rules.ts, 10 minutes at 60 Hz). */
export const MAX_RUN_STEPS = 36_000;

/**
 * A recording holds every frame since load, deaths included. The server rejects more than
 * MAX_RUN_STEPS, so longer runs are never sent and the best time stays local. Malformed input
 * is skipped too: a submission problem must never reach the player.
 */
export function shouldSubmitRun(run: Pick<RunResult, 'solution'>): boolean {
  const frames: unknown = run?.solution?.steps; // run may be garbage at runtime: never throw
  return typeof frames === 'number' && Number.isInteger(frames) && frames >= 1 && frames <= MAX_RUN_STEPS;
}
