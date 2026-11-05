/**
 * Build-time guard on what Vite may inline into the client (CLAUDE.md "Secrets":
 * only the Supabase URL and anon key reach the browser). Runs on every
 * `vite build`, `vite` dev start and `vite preview` through `vite.config.ts`,
 * so a secret pasted into `.env` fails the build instead of landing in `dist/`.
 * `scripts/package.mjs` (backend) builds through the same config and adds its
 * release-only checks on top (no QA hook, scan of the output).
 *
 * Owner: tech-lead. Security review 2026-11-04, HIGH 2
 * (`docs/tech/reviews/2026-11-security-backend.md`).
 */
import type { Plugin } from 'vite';

/** The only `VITE_` variables the client may see. `VITE_QA_HOOK` is the e2e build switch (architecture.md, QA hook). */
export const ALLOWED_CLIENT_VARS: readonly string[] = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_QA_HOOK'];

export const CLIENT_ENV_PREFIX = 'VITE_';

const PUBLISHABLE_KEY_PREFIX = 'sb_publishable_';
const SECRET_KEY_PREFIX = 'sb_secret_';
const JWT = /^[\w-]+\.([\w-]+)\.[\w-]+$/;
const JWT_ANYWHERE = /eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g;
/** Local Supabase (`supabase start`) serves plain http on the loopback address. */
const LOCAL_HTTP = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/;

export type ClientEnv = Readonly<Record<string, string | undefined>>;

/** The `role` claim of a JWT payload segment, or undefined when it is not a readable JWT. */
function jwtRole(payloadSegment: string): string | undefined {
  try {
    const payload: unknown = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'));
    if (typeof payload !== 'object' || payload === null) return undefined;
    const role = (payload as { role?: unknown }).role;
    return typeof role === 'string' ? role : undefined;
  } catch {
    return undefined;
  }
}

/** True for a key that is safe to publish: a publishable key, or a JWT whose role is `anon`. */
export function isPublicKey(key: string): boolean {
  if (key.startsWith(PUBLISHABLE_KEY_PREFIX)) return true;
  const segment = JWT.exec(key)?.[1];
  return segment !== undefined && jwtRole(segment) === 'anon';
}

/** Secret material anywhere in a value: a secret key, or an embedded JWT whose role is not `anon`. */
function secretIn(value: string): string | null {
  if (value.includes(SECRET_KEY_PREFIX)) return `a Supabase secret key (${SECRET_KEY_PREFIX}...)`;
  for (const match of value.matchAll(JWT_ANYWHERE)) {
    const role = jwtRole(match[1] ?? '');
    if (role !== 'anon') return `a JWT with role "${role ?? 'unknown'}"`;
  }
  return null;
}

function supabaseProblems(env: ClientEnv): string[] {
  const url = env['VITE_SUPABASE_URL'] ?? '';
  const key = env['VITE_SUPABASE_ANON_KEY'] ?? '';
  if (url === '' && key === '') return [];
  if (url === '' || key === '') return ['set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or neither (offline build)'];
  const problems: string[] = [];
  if (!url.startsWith('https://') && !LOCAL_HTTP.test(url)) {
    problems.push('VITE_SUPABASE_URL must start with https:// (or http://localhost / http://127.0.0.1 for a local Supabase)');
  }
  if (!isPublicKey(key)) {
    problems.push(`VITE_SUPABASE_ANON_KEY must be the public key (${PUBLISHABLE_KEY_PREFIX}... or a JWT with role "anon")`);
  }
  return problems;
}

/** Everything wrong with the variables Vite would expose; [] when the client env is safe. */
export function clientEnvProblems(env: ClientEnv): string[] {
  const names = Object.keys(env).filter((k) => k.startsWith(CLIENT_ENV_PREFIX));
  const unknown = names.filter((k) => !ALLOWED_CLIENT_VARS.includes(k)).map((k) => `${k} is not allowed in the client`);
  const secrets = names.flatMap((k) => {
    const found = secretIn(env[k] ?? '');
    return found === null ? [] : [`${k} contains ${found}`];
  });
  return [...unknown, ...secrets, ...supabaseProblems(env)];
}

/** Throws with every problem listed, so a bad `.env` stops the build or the dev server before anything is served. */
export function assertClientEnv(env: ClientEnv, envPrefix: string | readonly string[] | undefined): void {
  const prefixes = typeof envPrefix === 'string' ? [envPrefix] : (envPrefix ?? [CLIENT_ENV_PREFIX]);
  const problems = prefixes.every((p) => p === CLIENT_ENV_PREFIX) ? clientEnvProblems(env) : [`envPrefix must be "${CLIENT_ENV_PREFIX}"`];
  if (problems.length === 0) return;
  const list = problems.map((p) => `  - ${p}`).join('\n');
  throw new Error(
    `Unsafe client environment (CLAUDE.md "Secrets"; check .env and the shell):\n${list}\n` +
      'If a secret key was exposed, rotate it in the Supabase dashboard (Project Settings > API).',
  );
}

/** Vite plugin: checks the resolved client env on every build, dev and preview start. */
export function envGuard(): Plugin {
  return {
    name: 'redshift-env-guard',
    configResolved(config) {
      assertClientEnv(config.env, config.envPrefix);
    },
  };
}
