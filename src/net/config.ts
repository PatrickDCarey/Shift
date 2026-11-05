// Reads the two public Supabase values and refuses anything that looks wrong.
// Only the project URL and the anon key may ever reach the client (CLAUDE.md,
// "Secrets"). Owner: backend-engineer.

import type { NetConfig } from './types';

/** The part of `import.meta.env` this module reads. */
export interface NetEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function normaliseUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const secure = url.protocol === 'https:';
  const local = url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
  if (!secure && !local) return null;
  if (url.username !== '' || url.password !== '') return null;
  // Origin plus an optional path prefix, no query, no fragment, no trailing slash.
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

/** True for keys that must never ship in a client: new-style secret keys and service-role JWTs. */
export function looksLikeSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const b64 = (parts[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const payload: unknown = JSON.parse(atob(b64));
    return (
      typeof payload === 'object' &&
      payload !== null &&
      (payload as { role?: unknown }).role === 'service_role'
    );
  } catch {
    return false;
  }
}

/**
 * Returns the validated config, or null when leaderboards are off: a value is
 * missing or empty, the URL is not https (http only for localhost), or the key
 * looks like a secret one. Null is a normal state (offline build), not an error.
 */
export function readNetConfig(env: NetEnv | undefined): NetConfig | null {
  const rawUrl = env?.VITE_SUPABASE_URL;
  const rawKey = env?.VITE_SUPABASE_ANON_KEY;
  if (typeof rawUrl !== 'string' || typeof rawKey !== 'string') return null;
  const anonKey = rawKey.trim();
  if (rawUrl.trim() === '' || anonKey === '') return null;
  // A header value with whitespace or control characters can never be valid.
  if (/[\s\u0000-\u001f\u007f]/.test(anonKey)) return null;
  if (looksLikeSecretKey(anonKey)) return null;
  const baseUrl = normaliseUrl(rawUrl);
  return baseUrl === null ? null : { baseUrl, anonKey };
}
