// Leaderboard client: plain fetch against the PostgREST endpoint of the Supabase
// project. Every public call resolves (never throws, never rejects), has a hard
// time limit, and does nothing at all when the build has no Supabase values.
// The game must play identically with no network (CLAUDE.md, "Offline first").
// Owner: backend-engineer.

import type { RunResult } from '../core/types';
import type {
  LeaderboardEntry,
  NetConfig,
  NetFailure,
  NetFailureReason,
  NetResult,
  SubmitReceipt,
} from './types';
import { MAX_LIMIT, MAX_OFFSET, clampInt, isLevelId, isLevelVersion, parseEntries } from './validate';

export const DEFAULT_TIMEOUT_MS = 5000;
/** A board of MAX_LIMIT rows is about 15 KB; anything near this is not one. */
const MAX_BODY_CHARS = 256 * 1024;
/** Explicit columns only: `input_log` is not readable by clients and `*` would be refused. */
const SELECT_COLUMNS = 'display_name,steps,verified,created_at';
const ORDER = 'steps.asc,created_at.asc,id.asc';

/**
 * Where `submitRun` will POST once the edge function exists (M3-11, wired in
 * M3-13). Clients never insert into `runs` directly; RLS forbids it.
 */
export const SUBMIT_RUN_PATH = '/functions/v1/submit-run';

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface NetClientOptions {
  /** Null means leaderboards are off in this build. */
  readonly config: NetConfig | null;
  /** Defaults to the global `fetch`, looked up at call time. */
  readonly fetch?: FetchLike;
  /** Hard limit for one call, request and body together. */
  readonly timeoutMs?: number;
  /** Defaults to `navigator.onLine` (only a `false` is trusted). */
  readonly isOnline?: () => boolean;
}

export interface NetClient {
  /** False when there is no config: every call then resolves `disabled`. */
  readonly enabled: boolean;
  /** Top runs for one level version, best first. Offset is for paging. */
  fetchTopRuns(
    levelId: string,
    levelVersion: number,
    limit: number,
    offset?: number,
  ): Promise<NetResult<readonly LeaderboardEntry[]>>;
  /** Stub: resolves `unavailable` until the submit-run edge function exists. */
  submitRun(run: RunResult): Promise<NetResult<SubmitReceipt>>;
}

const fail = (reason: NetFailureReason, status?: number): NetFailure =>
  status === undefined ? { ok: false, reason } : { ok: false, reason, status };

function defaultIsOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

function defaultFetch(input: string, init: RequestInit): Promise<Response> {
  return globalThis.fetch(input, init);
}

function safeOnline(probe: () => boolean): boolean {
  try {
    return probe();
  } catch {
    return true; // an odd environment is not proof of being offline: try, the timeout protects us
  }
}

/** One GET, parsed as JSON, bounded by `timeoutMs` for the whole exchange. */
async function getJson(
  url: string,
  config: NetConfig,
  fetchFn: FetchLike,
  timeoutMs: number,
): Promise<NetResult<unknown>> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The race guarantees a resolution even if fetch ignores the abort signal.
  const timeout = new Promise<NetFailure>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(fail('timeout'));
    }, timeoutMs);
  });
  const work = (async (): Promise<NetResult<unknown>> => {
    try {
      const res = await fetchFn(url, {
        method: 'GET',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          Accept: 'application/json',
        },
        credentials: 'omit',
        redirect: 'error', // never forward the key to another host
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) return fail('http', res.status);
      const text = await res.text();
      if (text.length > MAX_BODY_CHARS) return fail('invalid-response');
      try {
        return { ok: true, data: JSON.parse(text) as unknown };
      } catch {
        return fail('invalid-response');
      }
    } catch {
      return controller.signal.aborted ? fail('timeout') : fail('offline');
    }
  })();
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function topRunsUrl(config: NetConfig, levelId: string, version: number, limit: number, offset: number): string {
  const params = new URLSearchParams({
    level_id: `eq.${levelId}`,
    level_version: `eq.${version}`,
    select: SELECT_COLUMNS,
    order: ORDER,
    limit: String(limit),
    offset: String(offset),
  });
  return `${config.baseUrl}/rest/v1/runs?${params.toString()}`;
}

export function createNetClient(options: NetClientOptions): NetClient {
  const { config } = options;
  const fetchFn = options.fetch ?? defaultFetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const isOnline = options.isOnline ?? defaultIsOnline;

  async function fetchTopRuns(
    levelId: string,
    levelVersion: number,
    limit: number,
    offset = 0,
  ): Promise<NetResult<readonly LeaderboardEntry[]>> {
    try {
      if (config === null) return fail('disabled');
      if (!isLevelId(levelId) || !isLevelVersion(levelVersion)) return fail('invalid-args');
      if (!safeOnline(isOnline)) return fail('offline');
      const rows = clampInt(limit, 1, MAX_LIMIT, 10);
      const skip = clampInt(offset, 0, MAX_OFFSET, 0);
      const url = topRunsUrl(config, levelId, levelVersion, rows, skip);
      const res = await getJson(url, config, fetchFn, timeoutMs);
      if (!res.ok) return res;
      const entries = parseEntries(res.data, rows);
      return entries === null ? fail('invalid-response') : { ok: true, data: entries };
    } catch {
      return fail('offline'); // unreachable by design; a rejection here would break the offline-first rule
    }
  }

  async function submitRun(_run: RunResult): Promise<NetResult<SubmitReceipt>> {
    // No request until the edge function exists (M3-11). M3-13 builds the payload
    // from the RunResult and POSTs it to SUBMIT_RUN_PATH with a timeout, like reads.
    return config === null ? fail('disabled') : fail('unavailable');
  }

  return { enabled: config !== null, fetchTopRuns, submitRun };
}
