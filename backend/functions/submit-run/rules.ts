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
  'w2-03': { version: 2, fastest: 142 },
  'w2-04': { version: 1, fastest: 192 },
  'w2-05': { version: 2, fastest: 3206 },
  'w3-01': { version: 1, fastest: 195 },
  'w3-02': { version: 1, fastest: 476 },
  'w3-03': { version: 1, fastest: 552 },
  'w3-04': { version: 1, fastest: 342 },
  'w3-05': { version: 2, fastest: 680 },
  'w4-01': { version: 1, fastest: 432 },
  'w4-02': { version: 1, fastest: 330 },
  'w4-03': { version: 1, fastest: 200 },
  'w4-04': { version: 1, fastest: 1430 },
  'w4-05': { version: 1, fastest: 3946 },
  'w5-01': { version: 1, fastest: 156 },
  'w5-02': { version: 1, fastest: 546 },
  'w5-03': { version: 1, fastest: 721 },
  'w5-04': { version: 1, fastest: 697 },
  'w5-05': { version: 1, fastest: 3652 },
};

export const FLOOR_PERCENT = 85;
export const NAME_MAX = 12;
/** 10 minutes at 60 Hz; no level takes longer, and replay cost stays bounded. */
export const MAX_RUN_STEPS = 36_000;
/** Long levels with checkpoints: a run is every frame since load, deaths included (about 5 chars per one-step token). */
export const MAX_LOG_CHARS = 32_000;
export const MAX_BODY_CHARS = 40_000;
/** Request body cap in bytes (K5): the 32 000-character log plus a small envelope, with room for escapes. */
export const MAX_BODY_BYTES = 56_000;
/** At least 20 per minute per IP must be accepted (spec); this leaves headroom. */
export const RATE_LIMIT_PER_MINUTE = 30;
/** Attempt cap per IP per hour, rejected attempts included (B2): bounds storage, since a stored run can carry a 32 KB log. */
export const RATE_LIMIT_PER_HOUR = 200;

/**
 * Blocklist from design-lead (request of 2026-11-16), matched after `normaliseName`. Server only:
 * the client never ships it. CONTAINS words are rejected anywhere in the name; WHOLE words only
 * when the whole name equals them (so CLASS, GRAPE, COCKPIT and BASS stay allowed).
 */
export const DEFAULT_BLOCKLIST: readonly string[] = [
  'FUCK', 'SHIT', 'CUNT', 'NIGGER', 'NIGGA', 'FAGGOT', 'RETARD', 'WHORE', 'SLUT', 'BITCH', 'TWAT',
  'PUSSY', 'ASSHOLE', 'DILDO', 'JIZZ', 'PORN', 'RAPIST', 'NAZI', 'HITLER', 'SIEGHEIL', 'KKK', 'KIKE', 'IA88',
];
export const DEFAULT_WHOLE_BLOCKLIST: readonly string[] = [
  'ASS', 'CUM', 'COCK', 'DICK', 'FAG', 'RAPE', 'SPIC', 'CHINK', 'TIT', 'TITS', 'WANK', 'PENIS', 'SEX', '88',
];

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
export function isAllowedName(
  name: unknown,
  blocklist: readonly string[] = DEFAULT_BLOCKLIST,
  whole: readonly string[] = DEFAULT_WHOLE_BLOCKLIST,
): name is string {
  if (typeof name !== 'string' || name.length < 1 || name.length > NAME_MAX) return false;
  if (!/^[A-Z0-9-]+( [A-Z0-9-]+)*$/.test(name)) return false;
  const normalised = normaliseName(name);
  if (whole.includes(normalised)) return false;
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

/**
 * Retention (B2): each name keeps one row per level version, its best. `best` is the lowest
 * stored step count for that name on that level version, or null if none. Ties keep the older run.
 */
export function shouldStore(best: number | null, steps: number): boolean {
  return best === null || steps < best;
}

const HEX_GROUP = /^[0-9a-f]{1,4}$/;

function ipv4(text: string): string | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^(0|[1-9][0-9]{0,2})$/.test(p) ? Number(p) : Number.NaN));
  return nums.every((n) => n <= 255) ? nums.join('.') : null;
}

/** Expands an IPv6 text to its 8 groups, or null if malformed. Zone ids and embedded dotted tails are not accepted here. */
function ipv6Groups(text: string): string[] | null {
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] === '' ? [] : halves[0].split(':');
  const tail = halves.length === 2 && halves[1] !== '' ? halves[1].split(':') : [];
  const fill = 8 - head.length - tail.length;
  if (halves.length === 1 ? fill !== 0 : fill < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? fill : 0).fill('0'), ...tail];
  return groups.length === 8 && groups.every((g) => HEX_GROUP.test(g)) ? groups : null;
}

/**
 * Rate-limit bucket for an address (K1): IPv4 as is; `::ffff:a.b.c.d` (and its hex form) as the IPv4
 * address; any other IPv6 by its /64 prefix (a client owns a whole /64, so one address per request
 * would be a fresh bucket each time). Null when the text is not an address.
 */
export function ipBucket(raw: string): string | null {
  const text = raw.trim().toLowerCase();
  if (text.length < 3 || text.length > 45) return null;
  if (!text.includes(':')) return ipv4(text);
  const mapped = /^::ffff:(.+)$/.exec(text);
  if (mapped !== null) {
    const v4 = ipv4(mapped[1]);
    if (v4 !== null) return v4;
  }
  const groups = ipv6Groups(text);
  if (groups === null) return null;
  if (groups.slice(0, 5).every((g) => /^0{1,4}$/.test(g)) && groups[5] === 'ffff') {
    const hi = parseInt(groups[6], 16);
    const lo = parseInt(groups[7], 16);
    return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
  }
  return groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

/**
 * Caller IP for the rate limit (B-2, K1). ONLY `cf-connecting-ip` is trusted: the CDN overwrites it,
 * whereas `x-real-ip` and `x-forwarded-for` can carry whatever the client sent. With no usable value
 * the result is null and the function fails closed (503 `rate`): requests never share one bucket
 * and never get a free pass. See backend/README.md "first real deploy" item 4 for the header check.
 */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const raw = headers.get('cf-connecting-ip');
  return raw === null ? null : ipBucket(raw);
}

/** Chance that one call also prunes old attempt rows inside `submit_attempt` (B-3: no table-wide delete per call). */
export const PRUNE_PROBABILITY = 0.02;
export const shouldPrune = (random: number): boolean => random < PRUNE_PROBABILITY;

/** Reads the answer of the SQL function `submit_attempt`; anything else (error, odd shape) fails closed. */
export function attemptVerdict(data: unknown): RateVerdict {
  return data === 'ok' ? 'ok' : data === 'limited' ? 'limited' : 'unavailable';
}

export interface RecordResult {
  readonly stored: boolean;
  readonly rank: number;
  readonly total: number;
}

function toCount(v: unknown): number {
  if (typeof v === 'number') return v;
  return typeof v === 'string' && /^[0-9]{1,9}$/.test(v) ? Number(v) : Number.NaN; // bigint can arrive as a string
}

/** Reads the one row of the SQL function `record_run` (`was_stored`, `board_rank`, `board_total`); null if malformed. */
export function parseRecordResult(data: unknown): RecordResult | null {
  const row: unknown = Array.isArray(data) ? data[0] : data;
  if (typeof row !== 'object' || row === null) return null;
  const { was_stored: stored, board_rank: rank, board_total: total } = row as Record<string, unknown>;
  const r = toCount(rank);
  const t = toCount(total);
  if (typeof stored !== 'boolean' || !Number.isInteger(r) || !Number.isInteger(t) || r < 1 || t < r) return null;
  return { stored, rank: r, total: t };
}

/** Keyed hash of an IP (HMAC-SHA-256, hex), so raw addresses are never stored. */
export async function hashIp(ip: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(ip)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}
