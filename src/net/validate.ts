// Validation of everything that comes back from the network. The response is
// untrusted: a wrong shape is a failure, never a crash. Owner: backend-engineer.

import { isDisplayName } from '../core/types';
import type { LeaderboardEntry } from './types';

/** Shape of a level id, matching the `runs_level_id_format` check in 0001_runs.sql. */
export const LEVEL_ID_PATTERN = /^w[0-5]-[0-9]{2}$/;
export const MAX_LIMIT = 100;
export const MAX_OFFSET = 10_000;
const MAX_STEPS = 36_000; // the server's MAX_RUN_STEPS and runs_steps_range (0002)

export function isLevelId(value: unknown): value is string {
  return typeof value === 'string' && LEVEL_ID_PATTERN.test(value);
}

export function isLevelVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 2_147_483_647;
}

/** Clamps to a whole number in [min, max]; non-numbers and NaN give `fallback`. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEntry(row: unknown): LeaderboardEntry | null {
  if (!isRecord(row)) return null;
  const { display_name: name, steps, verified, created_at: createdAt } = row;
  if (typeof name !== 'string' || !isDisplayName(name)) return null; // the shared allow-list: what the server can write
  if (typeof steps !== 'number' || !Number.isInteger(steps) || steps < 1 || steps > MAX_STEPS) return null;
  if (typeof verified !== 'boolean') return null;
  if (typeof createdAt !== 'string' || createdAt.length > 64 || Number.isNaN(Date.parse(createdAt))) {
    return null;
  }
  return { displayName: name, steps, verified, createdAt };
}

/**
 * Parses a PostgREST list of `runs` rows. Returns null if the body is not an
 * array, has more rows than were asked for, or any row is malformed: a partly
 * wrong board is more likely schema drift or tampering than something to show.
 */
export function parseEntries(body: unknown, limit: number): LeaderboardEntry[] | null {
  if (!Array.isArray(body) || body.length > limit) return null;
  const entries: LeaderboardEntry[] = [];
  for (const row of body) {
    const entry = parseEntry(row);
    if (entry === null) return null;
    entries.push(entry);
  }
  return entries;
}
