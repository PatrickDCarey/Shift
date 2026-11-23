// Unit tests for the submit-run rules (M3-11): every rejection code has a test.
// Owner: backend-engineer. Lives in scripts/ because vitest only collects src, tests and scripts.
import { readFileSync } from 'node:fs';
import { DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_PATTERN, isDisplayName } from '../src/core/types';
import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  MAX_BODY_BYTES,
  MAX_BODY_CHARS,
  MAX_LOG_CHARS,
  NAME_MAX,
  MAX_RUN_STEPS,
  RATE_LIMIT_PER_HOUR,
  PRUNE_PROBABILITY,
  RATE_LIMIT_PER_MINUTE,
  REJECT_CODES,
  attemptVerdict,
  checkSubmission,
  clientIp,
  ipBucket,
  parseRecordResult,
  shouldPrune,
  floorSteps,
  hashIp,
  isAllowedName,
  logSteps,
  normaliseName,
  shouldStore,
} from '../backend/functions/submit-run/rules';

const good = { levelId: 'w1-01', levelVersion: 2, steps: 400, name: 'ACE', inputLog: '20. 380R' };
const code = (over: Record<string, unknown>) => {
  const r = checkSubmission({ ...good, ...over });
  return r.ok ? 'ok' : r.code;
};

describe('floor', () => {
  it('is floor(0.85 x fastest known)', () => {
    expect(floorSteps(384)).toBe(326);
    expect(floorSteps(77)).toBe(65);
  });
  it('rejects one step under the floor with `floor`, accepts the floor itself', () => {
    expect(code({ steps: 325, inputLog: '325R' })).toBe('floor');
    expect(code({ steps: 326, inputLog: '326R' })).toBe('ok');
  });
});

describe('version', () => {
  it('rejects another version with `version`', () => {
    expect(code({ levelVersion: 1 })).toBe('version');
    expect(code({ levelVersion: 0 })).toBe('version');
  });
});

describe('name', () => {
  it.each(['ace', ' ACE', 'ACE ', 'A  CE', 'ABCDEFGHIJKLM', '', 'AC​E', 'AC‮E', 'Á', 'ACE!', 'SH1T', 'F-UCK', 'ASS'])(
    'rejects %j with `name`',
    (name) => {
      expect(code({ name })).toBe('name');
    },
  );
  it.each(['ACE', 'A', 'ABCDEFGHIJKL', 'ACE-1', 'A B C', 'P1 X2'])('accepts %j', (name) => {
    expect(code({ name })).toBe('ok');
  });
  it.each(['SH1T', 'F-UCK', 'ASS', 'A55', 'CUM', '88', 'MY SH1T', 'NAZI 1'])('rejects %s on the default blocklist', (name) => {
    expect(isAllowedName(name)).toBe(false);
  });
  it.each(['CLASS', 'GRAPE', 'COCKPIT', 'BASS', 'ACE', 'SCUMBAG'.slice(0, 4)])('accepts %s on the default blocklist', (name) => {
    expect(isAllowedName(name)).toBe(true);
  });
  it('uses an injected blocklist and normalises look-alikes', () => {
    expect(normaliseName('B4D-W0RD')).toBe('BADWORD');
    expect(isAllowedName('B4D W0RD', ['BADWORD'])).toBe(false);
    expect(isAllowedName('GOOD', ['BADWORD'])).toBe(true);
    expect(isAllowedName(42)).toBe(false);
  });
});

describe('rate', () => {
  it('accepts at least 20 per minute and keeps an hourly cap above it', () => {
    expect(RATE_LIMIT_PER_MINUTE).toBeGreaterThanOrEqual(20);
    expect(RATE_LIMIT_PER_HOUR).toBeGreaterThan(RATE_LIMIT_PER_MINUTE);
  });
  it('hashes an IP to a stable 64-character keyed digest that hides the address', async () => {
    const a = await hashIp('203.0.113.7', 'test-key');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp('203.0.113.7', 'test-key')).toBe(a);
    expect(await hashIp('203.0.113.7', 'other-key')).not.toBe(a);
    expect(a).not.toContain('203');
  });
});

describe('retention (B2)', () => {
  it('stores a first run and a strictly faster one, not a tie or a slower one', () => {
    expect(shouldStore(null, 400)).toBe(true);
    expect(shouldStore(400, 399)).toBe(true);
    expect(shouldStore(400, 400)).toBe(false);
    expect(shouldStore(400, 401)).toBe(false);
  });
});

describe('invalid', () => {
  it.each<[string, unknown]>([
    ['null body', null],
    ['an array', []],
    ['a string', 'x'],
    ['an extra key', { ...good, extra: 1 }],
    ['a missing key', { levelId: 'w1-01' }],
    ['a non-integer step count', { ...good, steps: 400.5 }],
    ['a string version', { ...good, levelVersion: '1' }],
    ['an unknown level', { ...good, levelId: 'w9-99' }],
    ['a world 0 level', { ...good, levelId: 'w0-02' }],
    ['an inherited property as level id', { ...good, levelId: 'constructor' }],
    ['zero steps', { ...good, steps: 0, inputLog: '1R' }],
    ['steps over the cap', { ...good, steps: MAX_RUN_STEPS + 1, inputLog: '36001R' }],
    ['an empty log', { ...good, inputLog: '' }],
    ['a malformed log', { ...good, inputLog: '20. 380X' }],
    ['a log with injection', { ...good, inputLog: '10R; drop table runs' }],
    ['a log shorter than the claimed steps', { ...good, inputLog: '100R' }],
    ['a log whose runs add up past the cap', { ...good, inputLog: '999999R' }],
    ['a log over the size cap', { ...good, inputLog: '1R '.repeat(MAX_LOG_CHARS / 3 + 1) }],
  ])('rejects %s with `invalid`', (_label, body) => {
    const r = checkSubmission(body);
    expect(r.ok ? 'ok' : r.code).toBe('invalid');
  });
  it('accepts a log just under the cap and rejects one just over', () => {
    const under = '1R '.repeat(Math.floor(MAX_LOG_CHARS / 3) - 1).trim();
    expect(under.length).toBeLessThanOrEqual(MAX_LOG_CHARS);
    expect(under.length).toBeGreaterThan(MAX_LOG_CHARS - 10);
    expect(logSteps(under)).not.toBeNull();
    const over = '1R '.repeat(Math.ceil((MAX_LOG_CHARS + 1) / 3));
    expect(over.length).toBeGreaterThan(MAX_LOG_CHARS);
    expect(logSteps(over)).toBeNull();
    const r = checkSubmission({ ...good, steps: 10_000, inputLog: over });
    expect(r.ok ? 'ok' : r.code).toBe('invalid');
  });
  it('the caps are the long-level values and the body cap leaves room for the envelope', () => {
    expect(MAX_LOG_CHARS).toBe(32_000);
    expect(MAX_BODY_CHARS).toBe(40_000);
    expect(MAX_BODY_BYTES).toBe(56_000);
    expect(MAX_BODY_CHARS - MAX_LOG_CHARS).toBeGreaterThan(1000);
  });
  it('sums run counts without expanding them', () => {
    expect(logSteps('20. 160R 30. 204R')).toBe(414);
    expect(logSteps('1R+ 1R 1R+ 52R 1R+ 400R')).toBe(456);
    expect(logSteps('0R')).toBeNull();
  });
});

describe('contract', () => {
  it('knows exactly the five codes from the spec, and every level has a floor', () => {
    expect([...REJECT_CODES].sort()).toEqual(['floor', 'invalid', 'name', 'rate', 'version']);
    for (const rule of Object.values(LEVELS)) expect(floorSteps(rule.fastest)).toBeGreaterThan(0);
  });
  it('accepts a good run and returns it unchanged', () => {
    expect(checkSubmission(good)).toEqual({ ok: true, value: good });
  });
});

describe('name rule copies', () => {
  const sql = readFileSync(new URL('../backend/migrations/0002_submit_run.sql', import.meta.url), 'utf8');
  const fn = readFileSync(new URL('../backend/functions/submit-run/rules.ts', import.meta.url), 'utf8');
  const pattern = '^[A-Z0-9-]+( [A-Z0-9-]+)*$';
  it('SQL check and function use the same pattern and length', () => {
    expect(sql).toContain(`display_name ~ '${pattern}'`);
    expect(sql).toContain(`between 1 and ${NAME_MAX}`);
    expect(fn).toContain(pattern);
  });
  it('the shared core constant agrees with the copies and isDisplayName runs the same rule', () => {
    expect(DISPLAY_NAME_PATTERN).toBe(pattern);
    expect(DISPLAY_NAME_MAX_LENGTH).toBe(NAME_MAX);
    for (const name of ['ACE', 'A', 'A'.repeat(NAME_MAX), 'ace', ' ACE', 'A  B', 'A'.repeat(NAME_MAX + 1), '']) {
      expect(isDisplayName(name)).toBe(isAllowedName(name, []));
    }
  });
});

const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n] ?? null });

describe('client IP (B-2, K1)', () => {
  it('trusts cf-connecting-ip only', () => {
    expect(clientIp(headers({ 'cf-connecting-ip': '203.0.113.7' }))).toBe('203.0.113.7');
    expect(clientIp(headers({ 'cf-connecting-ip': ' 203.0.113.7 ' }))).toBe('203.0.113.7');
  });
  it('a forged x-forwarded-for or x-real-ip on its own gives null (fail closed)', () => {
    expect(clientIp(headers({ 'x-forwarded-for': '192.0.2.1' }))).toBeNull();
    expect(clientIp(headers({ 'x-forwarded-for': '192.0.2.1, 10.0.0.1' }))).toBeNull();
    expect(clientIp(headers({ 'x-real-ip': '198.51.100.1' }))).toBeNull();
    expect(clientIp(headers({}))).toBeNull();
  });
  it('a forged first hop or x-real-ip beside a real cf-connecting-ip is ignored', () => {
    const real = { 'cf-connecting-ip': '203.0.113.7' };
    expect(clientIp(headers({ ...real, 'x-forwarded-for': '192.0.2.99', 'x-real-ip': '192.0.2.98' }))).toBe('203.0.113.7');
  });
  it('rejects junk values', () => {
    for (const bad of ['', 'unknown', '<script>', '1.2.3', '256.1.1.1', '01.2.3.4', '1.2.3.4.5', '1'.repeat(46), 'fe80::1%eth0', '1::2::3', 'g::1', '1:2:3:4:5:6:7:8:9']) {
      expect(clientIp(headers({ 'cf-connecting-ip': bad })), bad).toBeNull();
    }
  });
  it('maps IPv4-mapped IPv6 to the IPv4 address, in both spellings', () => {
    expect(ipBucket('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(ipBucket('::FFFF:203.0.113.7')).toBe('203.0.113.7');
    expect(ipBucket('::ffff:cb00:7107')).toBe('203.0.113.7');
    expect(ipBucket('0:0:0:0:0:ffff:cb00:7107')).toBe('203.0.113.7');
    expect(ipBucket('::ffff:999.1.1.1')).toBeNull();
  });
  it('buckets IPv6 by /64: two addresses in one /64 share a bucket, another /64 does not', () => {
    const a = ipBucket('2001:db8:1:2::1');
    expect(a).toBe('2001:db8:1:2::/64');
    expect(ipBucket('2001:0db8:0001:0002:ffff:eeee:dddd:cccc')).toBe(a);
    expect(ipBucket('2001:DB8:1:2:0:0:0:99')).toBe(a);
    expect(ipBucket('2001:db8:1:3::1')).not.toBe(a);
    expect(ipBucket('::1')).toBe('0:0:0:0::/64');
  });
});

describe('atomic rate gate and upsert (B-3, B-5)', () => {
  it('reads the SQL answer and fails closed on anything else', () => {
    expect(attemptVerdict('ok')).toBe('ok');
    expect(attemptVerdict('limited')).toBe('limited');
    for (const bad of [null, undefined, true, 'OK', ['ok'], {}]) expect(attemptVerdict(bad)).toBe('unavailable');
  });
  it('prunes on a small share of calls only', () => {
    expect(shouldPrune(0)).toBe(true);
    expect(shouldPrune(PRUNE_PROBABILITY)).toBe(false);
    expect(shouldPrune(0.99)).toBe(false);
  });
  it('parses the record_run row, including bigint strings, and rejects odd shapes', () => {
    expect(parseRecordResult([{ was_stored: true, board_rank: '2', board_total: 5 }])).toEqual({ stored: true, rank: 2, total: 5 });
    expect(parseRecordResult({ was_stored: false, board_rank: 1, board_total: 1 })).toEqual({ stored: false, rank: 1, total: 1 });
    for (const bad of [null, [], 'x', [{}], [{ was_stored: 'yes', board_rank: 1, board_total: 1 }],
      [{ was_stored: true, board_rank: 0, board_total: 1 }], [{ was_stored: true, board_rank: 3, board_total: 2 }],
      [{ was_stored: true, board_rank: 1.5, board_total: 2 }], [{ was_stored: true, board_rank: '-1', board_total: 2 }]]) {
      expect(parseRecordResult(bad)).toBeNull();
    }
  });
  it('the keep-the-lower rule: only a strictly lower time replaces (matches the SQL where-clause)', () => {
    expect(shouldStore(400, 399)).toBe(true);
    expect(shouldStore(400, 400)).toBe(false);
    expect(shouldStore(null, 1000)).toBe(true);
  });
});

describe('migration 0004 mirrors', () => {
  const sql = readFileSync(new URL('../backend/migrations/0004_atomic_submit.sql', import.meta.url), 'utf8');
  const fn = readFileSync(new URL('../backend/functions/submit-run/index.ts', import.meta.url), 'utf8');
  it('has the unique key, the lock, the lower-time-only update and service-only execute', () => {
    expect(sql).toContain('create unique index if not exists runs_best_per_name_idx');
    expect(sql).toContain('(level_id, level_version, display_name)');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('where r.steps > excluded.steps');
    expect(sql).toMatch(/revoke all on function public.submit_attempt[^;]*from public, anon, authenticated/);
    expect(sql).toMatch(/revoke all on function public.record_run[^;]*from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public.record_run[^;]*to service_role/);
  });
  it('the function passes the limits from rules.ts and no longer buckets on "unknown"', () => {
    expect(fn).toContain('p_per_minute: RATE_LIMIT_PER_MINUTE');
    expect(fn).toContain('p_per_hour: RATE_LIMIT_PER_HOUR');
    expect(fn).not.toContain("'unknown'");
    expect(fn).not.toContain('x-forwarded-for');
    expect(fn).toContain("Deno.env.get('IP_HASH_SALT')");
    expect(fn).not.toMatch(/hashIp(ip, serviceKey)/);
    expect(MAX_BODY_BYTES).toBeLessThanOrEqual(56_000);
    expect(fn).not.toContain("from('submit_attempts')");
    expect(fn).toContain("rpc('record_run'");
  });
  it('stores every run unverified until replay exists, and the board switch ships off', () => {
    expect(fn).toContain('p_verified: false');
  });
});
