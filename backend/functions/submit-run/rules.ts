// submit-run v1: the pure rules (no Deno, no network, no clock), unit-tested from
// scripts/submit-run.test.ts. Owner: backend-engineer. Spec: docs/design/features/leaderboards.md,
// "Server rules". Rejections come back as { ok: false, code } with one of REJECT_CODES.

export const REJECT_CODES = ['name', 'floor', 'version', 'rate', 'invalid'] as const;
export type RejectCode = (typeof REJECT_CODES)[number];

/** What the function knows about a level. Baked at deploy from levels/README.md "Fastest known". */
export interface LevelRule {
  readonly version: number;
  readonly fastest: number;
}

/** Kept in step with each level file's `version:` header and levels/README.md "Fastest known" (scripts/levels-table.test.ts fails on drift). */
export const LEVELS: Readonly<Record<string, LevelRule>> = {
  'w1-01': { version: 2, fastest: 384 },
  'w1-02': { version: 2, fastest: 273 },
  'w1-03': { version: 1, fastest: 77 },
  'w1-04': { version: 2, fastest: 366 },
  'w1-05': { version: 1, fastest: 114 },
  'w2-01': { version: 1, fastest: 157 },
  'w2-02': { version: 1, fastest: 153 },
  'w2-03': { version: 1, fastest: 142 },
  'w3-01': { version: 1, fastest: 195 },
};

export const FLOOR_PERCENT = 85;
export const NAME_MAX = 12;
/** 10 minutes at 60 Hz; no level takes longer, and replay cost stays bounded. */
export const MAX_RUN_STEPS = 36_000;
export const MAX_LOG_CHARS = 16_000;
export const MAX_BODY_CHARS = 32_000;
/** At least 20 per minute per IP must be accepted (spec); this leaves headroom. */
export const RATE_LIMIT_PER_MINUTE = 30;
/** Stored-run cap per IP per hour (B2): bounds storage, since a stored run can carry a 16 KB log. */
export const RATE_LIMIT_PER_HOUR = 200;
/** Attempt rows older than this are pruned on every call (B1). */
export const ATTEMPT_RETENTION_MS = 3_600_000;

/** Names that are never allowed, compared after `normaliseName`. design-lead owns the real list. */
export const DEFAULT_BLOCKLIST: readonly string[] = ['ADMIN', 'MODERATOR'];

export interface Submission {
  readonly levelId: string;
  readonly levelVersion: number;
  readonly steps: number;
  readonly name: string;
  readonly inputLog: string;
}

export type Checked = { readonly ok: true; readonly value: Submission } | { readonly ok: false; readonly code: RejectCode };

const reject = (code: RejectCode): Checked => ({ ok: false, code });

/** Floor = 85% of the fastest known step count, rounded down. */
export function floorSteps(fastest: number): number {
  return Math.floor((fastest * FLOOR_PERCENT) / 100);
}

const LEET: Readonly<Record<string, string>> = { '0': 'O', '1': 'I', '3': 'E', '4': 'A', '5': 'S', '7': 'T' };

/** Spec: `0->O 1->I 3->E 4->A 5->S 7->T`, spaces and `-` removed. */
export function normaliseName(name: string): string {
  return name.replace(/[ -]/g, '').replace(/[013457]/g, (d) => LEET[d] ?? d);
}

/** 1 to 12 of A-Z 0-9 space `-`; no leading, trailing or doubled space; not on the blocklist. */
export function isAllowedName(name: unknown, blocklist: readonly string[] = DEFAULT_BLOCKLIST): name is string {
  if (typeof name !== 'string' || name.length < 1 || name.length > NAME_MAX) return false;
  if (!/^[A-Z0-9-]+( [A-Z0-9-]+)*$/.test(name)) return false;
  const normalised = normaliseName(name);
  return !blocklist.some((word) => word !== '' && normalised.includes(word));
}

const TOKEN = /^([1-9][0-9]{0,5})(?:\.|(?=[LRJ+!-])L?R?J?\+?-?!?)$/;

/**
 * Total steps of a run-length input log, or null if the log is malformed or longer than
 * MAX_RUN_STEPS. Sums the counts without expanding them, so `999999R` costs nothing.
 */
export function logSteps(log: string): number | null {
  if (log.length < 1 || log.length > MAX_LOG_CHARS) return null;
  let total = 0;
  for (const token of log.trim().split(/\s+/)) {
    const m = TOKEN.exec(token);
    if (m === null) return null;
    total += Number(m[1]);
    if (total > MAX_RUN_STEPS) return null;
  }
  return total;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Shape check only: right keys, right types, nothing else. */
function parseShape(body: unknown): Submission | null {
  if (!isRecord(body) || Object.keys(body).length !== 5) return null;
  const { levelId, levelVersion, steps, name, inputLog } = body;
  if (typeof levelId !== 'string' || typeof name !== 'string' || typeof inputLog !== 'string') return null;
  if (!Number.isInteger(levelVersion) || !Number.isInteger(steps)) return null;
  return { levelId, levelVersion: levelVersion as number, steps: steps as number, name, inputLog };
}

/** Order: invalid (shape, level, steps, log), version, floor, name. Rate is checked before this. */
export function checkSubmission(
  body: unknown,
  levels: Readonly<Record<string, LevelRule>> = LEVELS,
  blocklist: readonly string[] = DEFAULT_BLOCKLIST,
): Checked {
  const sub = parseShape(body);
  if (sub === null) return reject('invalid');
  const level = Object.hasOwn(levels, sub.levelId) ? levels[sub.levelId] : undefined;
  if (level === undefined) return reject('invalid');
  if (sub.steps < 1 || sub.steps > MAX_RUN_STEPS) return reject('invalid');
  const recorded = logSteps(sub.inputLog);
  // A recording covers every frame since load, so it is at least as long as the winning run.
  if (recorded === null || recorded < sub.steps) return reject('invalid');
  if (sub.levelVersion !== level.version) return reject('version');
  if (sub.steps < floorSteps(level.fastest)) return reject('floor');
  if (!isAllowedName(sub.name, blocklist)) return reject('name');
  return { ok: true, value: sub };
}

/** True when this attempt is over the limit; `recent` counts attempts in the last minute, this one included. */
export function isRateLimited(recent: number, limit: number = RATE_LIMIT_PER_MINUTE): boolean {
  return recent > limit;
}

export type RateVerdict = 'ok' | 'limited' | 'unavailable';

/**
 * Rate decision from the attempt counts BEFORE this call is recorded (B1, B4). A count that
 * could not be read (`null`, a database error) is `unavailable`: the caller fails closed and
 * answers `rate` with 503 instead of letting the request through.
 */
export function rateVerdict(minute: number | null, hour: number | null): RateVerdict {
  if (minute === null || hour === null || !Number.isFinite(minute) || !Number.isFinite(hour)) return 'unavailable';
  if (minute >= RATE_LIMIT_PER_MINUTE || hour >= RATE_LIMIT_PER_HOUR) return 'limited';
  return 'ok';
}

/**
 * Retention (B2): each name keeps one row per level version, its best. `best` is the lowest
 * stored step count for that name on that level version, or null if none. Ties keep the older run.
 */
export function shouldStore(best: number | null, steps: number): boolean {
  return best === null || steps < best;
}

/** Keyed hash of an IP (HMAC-SHA-256, hex), so raw addresses are never stored. */
export async function hashIp(ip: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(ip)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}
