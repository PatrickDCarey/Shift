// Unit tests for the submit-run rules (M3-11): every rejection code has a test.
// Owner: backend-engineer. Lives in scripts/ because vitest only collects src, tests and scripts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  NAME_MAX,
  MAX_RUN_STEPS,
  RATE_LIMIT_PER_MINUTE,
  REJECT_CODES,
  checkSubmission,
  floorSteps,
  hashIp,
  isAllowedName,
  isRateLimited,
  logSteps,
  normaliseName,
} from '../backend/functions/submit-run/rules';

const good = { levelId: 'w1-01', levelVersion: 1, steps: 400, name: 'ACE', inputLog: '20. 380R' };
const code = (over: Record<string, unknown>) => {
  const r = checkSubmission({ ...good, ...over });
  return r.ok ? 'ok' : r.code;
};

describe('floor', () => {
  it('is floor(0.85 x fastest known)', () => {
    expect(floorSteps(364)).toBe(309);
    expect(floorSteps(77)).toBe(65);
  });
  it('rejects one step under the floor with `floor`, accepts the floor itself', () => {
    expect(code({ steps: 308, inputLog: '308R' })).toBe('floor');
    expect(code({ steps: 309, inputLog: '309R' })).toBe('ok');
  });
});

describe('version', () => {
  it('rejects another version with `version`', () => {
    expect(code({ levelVersion: 2 })).toBe('version');
    expect(code({ levelVersion: 0 })).toBe('version');
  });
});

describe('name', () => {
  it.each(['ace', ' ACE', 'ACE ', 'A  CE', 'ABCDEFGHIJKLM', '', 'AC​E', 'AC‮E', 'Á', 'ACE!', 'ADMIN', 'AD M1N', '4DM1N'])(
    'rejects %j with `name`',
    (name) => {
      expect(code({ name })).toBe('name');
    },
  );
  it.each(['ACE', 'A', 'ABCDEFGHIJKL', 'ACE-1', 'A B C', 'P1 X2'])('accepts %j', (name) => {
    expect(code({ name })).toBe('ok');
  });
  it('uses an injected blocklist and normalises look-alikes', () => {
    expect(normaliseName('B4D-W0RD')).toBe('BADWORD');
    expect(isAllowedName('B4D W0RD', ['BADWORD'])).toBe(false);
    expect(isAllowedName('GOOD', ['BADWORD'])).toBe(true);
    expect(isAllowedName(42)).toBe(false);
  });
});

describe('rate', () => {
  it('accepts at least 20 per minute and limits above the cap', () => {
    expect(RATE_LIMIT_PER_MINUTE).toBeGreaterThanOrEqual(20);
    expect(isRateLimited(20)).toBe(false);
    expect(isRateLimited(RATE_LIMIT_PER_MINUTE)).toBe(false);
    expect(isRateLimited(RATE_LIMIT_PER_MINUTE + 1)).toBe(true);
  });
  it('hashes an IP to a stable 64-character keyed digest that hides the address', async () => {
    const a = await hashIp('203.0.113.7', 'test-key');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp('203.0.113.7', 'test-key')).toBe(a);
    expect(await hashIp('203.0.113.7', 'other-key')).not.toBe(a);
    expect(a).not.toContain('203');
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
    ['a log over the size cap', { ...good, inputLog: '1R '.repeat(6000) }],
  ])('rejects %s with `invalid`', (_label, body) => {
    const r = checkSubmission(body);
    expect(r.ok ? 'ok' : r.code).toBe('invalid');
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
  it('the shared core constant, if it exists, agrees', () => {
    const core = readFileSync(new URL('../src/core/types.ts', import.meta.url), 'utf8');
    if (core.includes(pattern)) expect(core).toContain(String(NAME_MAX));
  });
});
