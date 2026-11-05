// Optional leaderboard client (Supabase). Never required at runtime. Owner: backend-engineer.
// Not wired into any scene yet (M3-13). Only the project URL and the anon key
// are read, from VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; without them the
// client is disabled and every call resolves { ok: false, reason: 'disabled' }.

import { createNetClient, type NetClient } from './client';
import { readNetConfig } from './config';

export { createNetClient, DEFAULT_TIMEOUT_MS, SUBMIT_RUN_PATH } from './client';
export type { FetchLike, NetClient, NetClientOptions } from './client';
export { readNetConfig } from './config';
export type { NetEnv } from './config';
export type {
  LeaderboardEntry,
  NetConfig,
  NetFailure,
  NetFailureReason,
  NetResult,
  NetSuccess,
  SubmitReceipt,
} from './types';

let shared: NetClient | undefined;

/** The app-wide client, built once from `import.meta.env`. Never throws. */
export function getNetClient(): NetClient {
  if (shared === undefined) {
    let env: ImportMetaEnv | undefined;
    try {
      env = import.meta.env;
    } catch {
      env = undefined;
    }
    shared = createNetClient({ config: readNetConfig(env) });
  }
  return shared;
}
