import { describe, expect, it } from 'vitest';
import { looksLikeSecretKey, readNetConfig } from './config';

const jwt = (role: string) => {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${enc({ alg: 'HS256' })}.${enc({ role })}.sig`;
};

const URL_OK = 'https://abc.supabase.co';

describe('readNetConfig', () => {
  it('returns the trimmed config for a good pair', () => {
    expect(readNetConfig({ VITE_SUPABASE_URL: ' https://abc.supabase.co/ ', VITE_SUPABASE_ANON_KEY: ' key ' })).toEqual({
      baseUrl: URL_OK,
      anonKey: 'key',
    });
  });

  it('drops query, fragment and trailing slashes from the URL', () => {
    const c = readNetConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co//?x=1#y', VITE_SUPABASE_ANON_KEY: 'k' });
    expect(c?.baseUrl).toBe(URL_OK);
  });

  it.each([
    ['undefined env', undefined],
    ['empty values', { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }],
    ['missing key', { VITE_SUPABASE_URL: URL_OK }],
    ['missing url', { VITE_SUPABASE_ANON_KEY: 'k' }],
    ['blank key', { VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: '   ' }],
    ['not a url', { VITE_SUPABASE_URL: 'abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }],
    ['plain http to a remote host', { VITE_SUPABASE_URL: 'http://abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }],
    ['credentials in the url', { VITE_SUPABASE_URL: 'https://u:p@abc.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }],
    ['a javascript: url', { VITE_SUPABASE_URL: 'javascript:alert(1)', VITE_SUPABASE_ANON_KEY: 'k' }],
    ['a key with a space inside', { VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: 'a b' }],
    ['a service-role JWT', { VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: jwt('service_role') }],
    ['a new-style secret key', { VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: 'sb_secret_abc' }],
  ])('is null for %s', (_name, env) => {
    expect(readNetConfig(env)).toBeNull();
  });

  it('allows http for a local Supabase', () => {
    expect(readNetConfig({ VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'k' })?.baseUrl).toBe(
      'http://localhost:54321',
    );
    expect(readNetConfig({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'k' })).not.toBeNull();
  });

  it('accepts an anon JWT and a publishable key', () => {
    expect(readNetConfig({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: jwt('anon') })).not.toBeNull();
    expect(readNetConfig({ VITE_SUPABASE_URL: URL_OK, VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc' })).not.toBeNull();
  });
});

describe('looksLikeSecretKey', () => {
  it('is false for undecodable three-part strings', () => {
    expect(looksLikeSecretKey('a.b.c')).toBe(false);
    expect(looksLikeSecretKey('a.%%%.c')).toBe(false);
  });
});
