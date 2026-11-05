/**
 * The Vite env guard (config/envGuard.ts): only the Supabase URL, a public key
 * and the QA switch may reach the client. Owner: tech-lead.
 */
import { describe, expect, it } from 'vitest';
import { assertClientEnv, clientEnvProblems, envGuard, isPublicKey } from '../../config/envGuard';

/** A structurally valid, unsigned test JWT with the given role claim (never a real key). */
function fakeJwt(role: string): string {
  const part = (o: object): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ iss: 'supabase', role })}.c2lnbmF0dXJl`;
}

const URL_OK = 'https://example.supabase.co';
const base = { BASE_URL: './', MODE: 'production', DEV: '', PROD: '1' };

describe('clientEnvProblems', () => {
  it('accepts an offline env, the QA switch, and a publishable or anon key', () => {
    expect(clientEnvProblems(base)).toEqual([]);
    expect(clientEnvProblems({ ...base, VITE_QA_HOOK: '1' })).toEqual([]);
    for (const key of ['sb_publishable_abc123', fakeJwt('anon')]) {
      expect(clientEnvProblems({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: key })).toEqual([]);
    }
    expect(clientEnvProblems({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: fakeJwt('anon') })).toEqual([]);
  });

  it('rejects a secret or service-role key in the anon slot', () => {
    for (const key of ['sb_secret_abc123', fakeJwt('service_role'), 'not-a-key']) {
      const problems = clientEnvProblems({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: key }).join('\n');
      expect(problems).toContain('VITE_SUPABASE_ANON_KEY');
    }
  });

  it('rejects unknown VITE_ variables and secrets hidden in any value', () => {
    expect(clientEnvProblems({ VITE_SECRET: 'x' }).join()).toContain('VITE_SECRET is not allowed');
    expect(clientEnvProblems({ VITE_QA_HOOK: `1 ${fakeJwt('service_role')}` }).join()).toContain('role "service_role"');
    expect(clientEnvProblems({ VITE_SUPABASE_URL: `${URL_OK}/sb_secret_x`, VITE_SUPABASE_ANON_KEY: fakeJwt('anon') }).join()).toContain(
      'secret key',
    );
  });

  it('requires both Supabase values or neither, and https outside loopback', () => {
    expect(clientEnvProblems({ VITE_SUPABASE_URL: URL_OK }).join()).toContain('both');
    expect(clientEnvProblems({ VITE_SUPABASE_ANON_KEY: fakeJwt('anon') }).join()).toContain('both');
    const plain = clientEnvProblems({ VITE_SUPABASE_URL: 'http://example.com', VITE_SUPABASE_ANON_KEY: fakeJwt('anon') });
    expect(plain.join()).toContain('https://');
  });

  it('ignores non-client variables (no VITE_ prefix)', () => {
    expect(clientEnvProblems({ ...base, SUPABASE_SERVICE_ROLE_KEY: fakeJwt('service_role') })).toEqual([]);
  });
});

describe('isPublicKey', () => {
  it('reads the role claim, not the text', () => {
    expect(isPublicKey(fakeJwt('anon'))).toBe(true);
    expect(isPublicKey(fakeJwt('authenticated'))).toBe(false);
    expect(isPublicKey('a.b.c')).toBe(false);
  });
});

describe('assertClientEnv and the plugin', () => {
  it('throws with every problem and a rotation note, and never echoes values', () => {
    const secret = 'sb_secret_DO_NOT_PRINT';
    const call = (): void => assertClientEnv({ VITE_X: '1', VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: secret }, 'VITE_');
    expect(call).toThrow(/VITE_X is not allowed[\s\S]*VITE_SUPABASE_ANON_KEY[\s\S]*rotate it/);
    try {
      call();
    } catch (error: unknown) {
      expect(String(error)).not.toContain('DO_NOT_PRINT');
    }
  });

  it('refuses a widened envPrefix', () => {
    expect(() => assertClientEnv(base, ['VITE_', 'SUPABASE_'])).toThrow(/envPrefix/);
    expect(() => assertClientEnv(base, undefined)).not.toThrow();
  });

  it('is wired as a Vite plugin with a configResolved hook', () => {
    const plugin = envGuard();
    expect(plugin.name).toBe('redshift-env-guard');
    expect(typeof plugin.configResolved).toBe('function');
  });
});
