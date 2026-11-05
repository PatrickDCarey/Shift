// Pure checks for `npm run package` (no Vite, no file system), so they can be unit-tested.
// Owner: backend-engineer. Only the Supabase URL and the public anon key may reach the client.

export class PackageError extends Error {}

export const ALLOWED_VITE_VARS = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);
/** Files that are binary by nature; everything else is scanned as text. */
export const BINARY_EXT = /\.(?:png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|ogg|mp3|wav|m4a|flac|mp4|webm|zip|gz|wasm|bin|atlas)$/i;
// `__redshift` as a whole word: the QA hook, not `__redshift_probe__` (save-storage probe key).
const HOOK = /__redshift(?![A-Za-z0-9_])/;
const JWT = /eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g;
/** A level solution header as `formatSolution` writes it: `level:` then `levelVersion:`. */
const RECORDING_HEADER = /^level:[ \t]*\S+[ \t]*\r?\n(?:[ \t]*(?:#[^\n]*)?\r?\n)*levelVersion:[ \t]*\d+/m;
const SECRET_PATTERNS = [
  [/sb_secret_/, 'a Supabase secret key (sb_secret_...)'],
  [/service_role/i, 'the string "service_role"'],
  [/SUPABASE_SERVICE/i, 'a SUPABASE_SERVICE... variable name'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key block'],
];
export const FORBIDDEN_NAME = /(?:^|\/)(?:\.env[^/]*|\.npmrc|\.DS_Store|Thumbs\.db)$|\.(?:map|pem|key)$/i;

/** The `role` claim of a JWT, or undefined when it is not a JWT with a JSON payload. */
export function jwtRole(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload?.role === 'string' ? payload.role : undefined;
  } catch {
    return undefined;
  }
}

/** Only a publishable key or a JWT whose role is `anon` may be baked into the client. */
export function isPublicKey(key) {
  return key.startsWith('sb_publishable_') || jwtRole(key) === 'anon';
}

/** Fail before building if `env` (the VITE_ variables) would put anything unsafe in the client. */
export function checkEnv(env) {
  if (env.VITE_QA_HOOK !== undefined) {
    throw new PackageError('VITE_QA_HOOK is set (shell or .env). The itch.io build must not install window.__redshift; unset it.');
  }
  const unknown = Object.keys(env).filter((k) => !ALLOWED_VITE_VARS.has(k));
  if (unknown.length > 0) {
    throw new PackageError(
      `Vite would expose ${unknown.join(', ')} to the browser. Only ${[...ALLOWED_VITE_VARS].join(' and ')} may reach the client; remove the others from .env and the shell.`,
    );
  }
  const url = env.VITE_SUPABASE_URL ?? '';
  const key = env.VITE_SUPABASE_ANON_KEY ?? '';
  if ((url === '') !== (key === '')) {
    throw new PackageError('Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or neither (offline build).');
  }
  if (url !== '' && !url.startsWith('https://')) {
    throw new PackageError('VITE_SUPABASE_URL must start with https:// in a release build.');
  }
  if (key !== '' && !isPublicKey(key)) {
    throw new PackageError(
      'VITE_SUPABASE_ANON_KEY is not a public key (sb_publishable_... or a JWT with role "anon"). If it is a secret or service-role key, rotate it in Supabase Project Settings > API.',
    );
  }
  return { leaderboards: url !== '' };
}

/** Problems found in one file of the finished build (empty list = fine). `name` uses forward slashes. */
export function scanFile(name, data) {
  const problems = [];
  if (FORBIDDEN_NAME.test(name)) problems.push(`${name}: must not ship (env file, key file, source map or OS junk)`);
  if (BINARY_EXT.test(name)) return problems;
  const text = Buffer.from(data).toString('utf8');
  if (HOOK.test(text)) problems.push(`${name}: contains the QA hook name "__redshift"`);
  if (RECORDING_HEADER.test(text)) problems.push(`${name}: contains a level recording header (level: / levelVersion:); solutions must not ship`);
  for (const [pattern, what] of SECRET_PATTERNS) {
    if (pattern.test(text)) problems.push(`${name}: contains ${what}`);
  }
  for (const token of text.match(JWT) ?? []) {
    if (jwtRole(token) !== 'anon') problems.push(`${name}: contains a JWT whose role is not "anon"`);
  }
  if (name === 'index.html' && /(?:src|href)=["']\/(?!\/)/.test(text)) {
    problems.push('index.html: has an absolute asset path (needs ./ so it runs from a subfolder)');
  }
  return problems;
}
