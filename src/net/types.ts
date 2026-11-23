// Types for the optional leaderboard client. Owner: backend-engineer.

/** Why a call did not produce data. Callers may ignore it: failures are quiet by design. */
export type NetFailureReason =
  | 'disabled' // no Supabase URL / anon key in this build: the game is offline-only
  | 'offline' // no connection, or the request could not be made
  | 'timeout' // no complete answer within the time limit
  | 'http' // the server answered with a non-2xx status (see `status`)
  | 'invalid-response' // the body was not the shape we asked for
  | 'invalid-args' // refused before any request: the arguments are not a valid query
  | 'skipped' // the run is longer than the server accepts (MAX_RUN_STEPS frames): it stays local-only
  | 'unavailable'; // the feature does not exist yet (submit-run, M3-11)

export interface NetFailure {
  readonly ok: false;
  readonly reason: NetFailureReason;
  /** HTTP status, only with reason 'http'. */
  readonly status?: number;
}

export interface NetSuccess<T> {
  readonly ok: true;
  readonly data: T;
}

/** Every public call resolves to one of these and never throws or rejects. */
export type NetResult<T> = NetSuccess<T> | NetFailure;

/** One leaderboard row, the public columns of `public.runs` (never `input_log`). */
export interface LeaderboardEntry {
  readonly displayName: string;
  /** Run time in 60 Hz simulation steps; lower is better. Seconds = steps / 60. */
  readonly steps: number;
  /** True once the server replayed the run (v2). */
  readonly verified: boolean;
  /** ISO timestamp from the server. */
  readonly createdAt: string;
}

/** What `submitRun` reports on success (nothing yet: the edge function does not exist). */
export interface SubmitReceipt {
  readonly accepted: true;
}

/** The two public client values, already validated. */
export interface NetConfig {
  /** Project URL without a trailing slash, https (or http on localhost). */
  readonly baseUrl: string;
  /** The anon / publishable key. Public by design, still never logged. */
  readonly anonKey: string;
}
