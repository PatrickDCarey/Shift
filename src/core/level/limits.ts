/**
 * Safety limits for untrusted input (solutions can arrive from a leaderboard
 * submission). 1,000,000 steps is about 4.6 hours of play at 60 Hz, far beyond
 * any real level.
 */
export const MAX_REPLAY_STEPS = 1_000_000;

/** Most errors a single parse reports before it summarises the rest. */
export const MAX_REPORTED_ERRORS = 25;
