/**
 * Secret check (M1-04, CLAUDE.md "Secrets"): no file that git would commit
 * holds a secret. Runs over `git ls-files --cached --others --exclude-standard`
 * (tracked files plus new files that are not ignored), so a key is caught
 * before its commit, and the git-ignored local `.env` is never read.
 * Owner: tech-lead.
 *
 * Fails on:
 * - a file name that only holds secrets: `.env`, `.env.*` (except
 *   `.env.example`), `*.pem`, `*.key`, `.npmrc`, `id_rsa*`;
 * - content: a Supabase secret key (`sb_secret_` + 20 or more key chars), a
 *   JWT whose role is not `anon` (service-role keys are JWTs), a PEM private
 *   key, a GitHub or AWS token, a non-empty `SUPABASE_SERVICE_ROLE_KEY=` value;
 * - a non-empty value in `.env.example`.
 * Test fixtures build their fake keys at run time (see the self-check here),
 * so no literal ever matches. Binary files (a NUL byte) are skipped.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..', '..');

const FORBIDDEN_NAMES: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  { pattern: /(^|\/)\.env(\..+)?$/, why: 'an env file (only .env.example may be committed)' },
  { pattern: /\.(pem|key)$/, why: 'a key file' },
  { pattern: /(^|\/)\.npmrc$/, why: 'an .npmrc (may hold a registry token)' },
  { pattern: /(^|\/)id_(rsa|ed25519|ecdsa)/, why: 'an SSH key' },
];
const ALLOWED_NAMES: readonly string[] = ['.env.example'];

const SB = 'sb_' + 'secret_';
const CONTENT_PATTERNS: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  { pattern: new RegExp(`${SB}[A-Za-z0-9_-]{20,}`), why: 'a Supabase secret key' },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: 'a PEM private key' },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}/, why: 'a GitHub token' },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}/, why: 'a GitHub fine-grained token' },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/, why: 'an AWS access key id' },
  { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*['"]?[A-Za-z0-9._-]{20,}/, why: 'a service-role key value' },
];
const JWT = /eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g;

/** The `role` claim of a JWT payload segment, or undefined when unreadable. */
function jwtRole(segment: string): string | undefined {
  try {
    const payload: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    const role = typeof payload === 'object' && payload !== null ? (payload as { role?: unknown }).role : undefined;
    return typeof role === 'string' ? role : undefined;
  } catch {
    return undefined;
  }
}

/** Problems with a path that git would commit; [] when the name is fine. */
function nameProblems(path: string): readonly string[] {
  if (ALLOWED_NAMES.includes(path)) return [];
  return FORBIDDEN_NAMES.filter(({ pattern }) => pattern.test(path)).map(({ why }) => `${path}: ${why}`);
}

/** Secrets in one text file; never echoes the matched value. */
function contentProblems(path: string, text: string): readonly string[] {
  const found = CONTENT_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ why }) => `${path}: contains ${why}`);
  const jwts = [...text.matchAll(JWT)]
    .map((m) => jwtRole(m[1] ?? ''))
    .filter((role) => role !== 'anon')
    .map((role) => `${path}: contains a JWT with role "${role ?? 'unknown'}"`);
  return [...found, ...jwts];
}

/** `.env.example` must stay a template: every `KEY=` line empty. */
function exampleProblems(text: string): readonly string[] {
  return text
    .split(/\r?\n/)
    .filter((line) => /^\s*[A-Z0-9_]+\s*=\s*\S/.test(line))
    .map((line) => `.env.example: ${line.split('=')[0]?.trim() ?? ''} has a value; keep the template empty`);
}

function committableFiles(): readonly string[] {
  const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT });
  return out.toString('utf8').split('\0').filter((p) => p !== '');
}

function fileProblems(path: string): readonly string[] {
  let bytes: Buffer;
  try {
    bytes = readFileSync(resolve(ROOT, path));
  } catch {
    return []; // listed by git but deleted in the working tree
  }
  if (bytes.includes(0)) return nameProblems(path);
  const text = bytes.toString('utf8');
  const example = path === '.env.example' ? exampleProblems(text) : [];
  return [...nameProblems(path), ...contentProblems(path, text), ...example];
}

describe('no secrets in committable files', () => {
  it('git lists the repo files', () => {
    expect(committableFiles()).toContain('package.json');
  });

  it('no secret file names or secret content', () => {
    expect(committableFiles().flatMap(fileProblems)).toEqual([]);
  });
});

describe('secret check self-check (fake keys built at run time)', () => {
  const b64 = (o: object): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = (role: string): string => `eyJhbGciOiJIUzI1NiJ9.${b64({ role })}.c2lnbmF0dXJl`;

  it('flags forbidden file names and allows .env.example', () => {
    for (const p of ['.env', '.env.local', 'backend/.env.production', 'certs/a.pem', 'a.key', '.npmrc', 'id_rsa']) {
      expect(nameProblems(p), p).toHaveLength(1);
    }
    expect(nameProblems('.env.example')).toEqual([]);
    expect(nameProblems('src/envGuard.ts')).toEqual([]);
  });

  it('flags each secret pattern without echoing it', () => {
    const fakes = [
      `${SB}${'a'.repeat(32)}`,
      `-----BEGIN ${'PRIVATE'} KEY-----`,
      `gh${'p'}_${'A'.repeat(36)}`,
      `github_${'pat'}_${'A'.repeat(30)}`,
      `AKIA${'A'.repeat(16)}`,
      `SUPABASE_SERVICE_ROLE_KEY=${'x'.repeat(40)}`,
      jwt('service_role'),
    ];
    for (const fake of fakes) {
      const problems = contentProblems('x.ts', `const k = '${fake}';`);
      expect(problems, fake.slice(0, 12)).toHaveLength(1);
      expect(problems.join()).not.toContain(fake);
    }
  });

  it('passes an anon JWT, short fixtures and empty templates', () => {
    expect(contentProblems('x.ts', `${jwt('anon')} ${SB}abc SUPABASE_SERVICE_ROLE_KEY=`)).toEqual([]);
    expect(exampleProblems('# c\nVITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n')).toEqual([]);
    expect(exampleProblems('VITE_SUPABASE_ANON_KEY=abc\n')).toHaveLength(1);
  });
});
