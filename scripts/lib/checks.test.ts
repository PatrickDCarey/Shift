// Unit tests for the package checks. Owner: backend-engineer. Fixtures only; no real keys.
import { describe, expect, it } from 'vitest';
import { PackageError, checkEnv, isPublicKey, jwtRole, scanFile } from './checks.mjs';

const b64 = (o: object): string => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (role: string): string => `eyJhbGciOiJIUzI1NiJ9.${b64({ role })}.c2lnbmF0dXJl`;
const bytes = (t: string): Uint8Array => new TextEncoder().encode(t);

describe('jwtRole / isPublicKey', () => {
  it('reads the role claim', () => {
    expect(jwtRole(jwt('anon'))).toBe('anon');
    expect(jwtRole(jwt('service_role'))).toBe('service_role');
    expect(jwtRole('not.a.jwt')).toBeUndefined();
    expect(jwtRole('plain')).toBeUndefined();
  });
  it('allows only publishable keys and anon JWTs', () => {
    expect(isPublicKey('sb_publishable_abc')).toBe(true);
    expect(isPublicKey(jwt('anon'))).toBe(true);
    expect(isPublicKey(jwt('service_role'))).toBe(false);
    expect(isPublicKey(jwt('authenticated'))).toBe(false);
    expect(isPublicKey('sb_secret_abc')).toBe(false);
    expect(isPublicKey('whatever')).toBe(false);
  });
});

describe('checkEnv', () => {
  const url = 'https://abc.supabase.co';
  it('accepts an offline build and a public-key build', () => {
    expect(checkEnv({})).toEqual({ leaderboards: false });
    expect(checkEnv({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' })).toEqual({ leaderboards: true });
  });
  it.each([
    ['QA hook', { VITE_QA_HOOK: '1' }],
    ['unknown variable', { VITE_OTHER: 'x' }],
    ['only one value', { VITE_SUPABASE_URL: url }],
    ['http url', { VITE_SUPABASE_URL: 'http://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' }],
    ['service-role JWT', { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: jwt('service_role') }],
    ['unrecognised key', { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: 'abc123' }],
  ])('refuses %s', (_label, env) => {
    expect(() => checkEnv(env)).toThrow(PackageError);
  });
});

describe('scanFile', () => {
  it('passes ordinary files and an anon key', () => {
    expect(scanFile('assets/a.js', bytes(`var k="${jwt('anon')}";`))).toEqual([]);
    expect(scanFile('index.html', bytes('<script src="./a.js"></script>'))).toEqual([]);
  });
  it('finds a service-role JWT inside a bundle', () => {
    expect(scanFile('assets/a.js', bytes(`x="${jwt('service_role')}"`)).join()).toMatch(/JWT/);
  });
  it('scans text assets with any extension, not only known ones', () => {
    expect(scanFile('shaders/a.frag', bytes('// sb_secret_abc')).join()).toMatch(/secret key/);
    expect(scanFile('x/unknown.dat', bytes('window.__redshift = 1')).join()).toMatch(/QA hook/);
  });
  it('skips binary files', () => {
    expect(scanFile('a.png', bytes('sb_secret_abc'))).toEqual([]);
  });
  it.each(['.env', 'sub/.env.local', '.npmrc', 'a/key.pem', 'b.key', 'a.js.map', 'Thumbs.db'])('refuses the file name %s', (name) => {
    expect(scanFile(name, bytes('x')).join()).toMatch(/must not ship/);
  });
  it('fails on a bundled recording header', () => {
    const rec = 'level: w1-01\nlevelVersion: 1\n# note\nsteps: 414\n---\n20. 160R\n';
    expect(scanFile('levels/w1-01.solution.txt', bytes(rec)).join()).toMatch(/recording header/);
    expect(scanFile('assets/a.txt', bytes('level: w1-01\r\nlevelVersion: 2'))).not.toEqual([]);
  });
  it('does not flag a level file that has no recording header', () => {
    expect(scanFile('levels/w1-01.txt', bytes('id: w1-01\nversion: 1\n'))).toEqual([]);
  });
  it('flags an absolute asset path in index.html only', () => {
    expect(scanFile('index.html', bytes('<script src="/a.js">')).join()).toMatch(/absolute/);
    expect(scanFile('other.html', bytes('<script src="/a.js">'))).toEqual([]);
  });
});
