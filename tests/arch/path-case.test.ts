/**
 * Windows and macOS treat file names case-insensitively, Linux CI does not.
 * Fails on (1) two repo paths that differ only in case, and (2) a relative
 * import whose case differs from the file on disk (works locally, breaks CI).
 * Owner: tech-lead.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', 'test-results', 'playwright-report', 'blob-report']);
const IMPORT_RE = /(?:from\s+|import\s*\(\s*|import\s+)['"](\.[^'"?]*)(?:\?[^'"]*)?['"]/g;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? [full, ...walk(full)] : [full];
  });
}

/** Paths (relative to ROOT) that share a lower-cased spelling with another path. */
function caseCollisions(paths: readonly string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const p of paths) groups.set(p.toLowerCase(), [...(groups.get(p.toLowerCase()) ?? []), p]);
  return [...groups.values()].filter((g) => g.length > 1);
}

/** True if every segment of `path` below ROOT exists with exactly this case. */
function existsExactCase(path: string): boolean {
  const parts = relative(ROOT, path).split(sep);
  return parts.every((part, i) => readdirSync(join(ROOT, ...parts.slice(0, i))).includes(part));
}

function importCaseErrors(file: string): string[] {
  const code = readFileSync(file, 'utf8');
  return [...code.matchAll(IMPORT_RE)].flatMap((m) => {
    const base = resolve(dirname(file), m[1] ?? '');
    const candidates = [base, `${base}.ts`, join(base, 'index.ts')].filter(
      (c) => existsSync(c) && statSync(c).isFile(),
    );
    const found = candidates[0];
    return found && !existsExactCase(found) ? [`"${m[1]}" does not match the case on disk`] : [];
  });
}

const files = walk(ROOT);

describe('path case', () => {
  it('no two repo paths differ only in case', () => {
    expect(caseCollisions(files.map((f) => relative(ROOT, f)))).toEqual([]);
  });

  const sources = files.filter((f) => /\.(ts|js|mjs)$/.test(f) && /^(src|tests)[\\/]/.test(relative(ROOT, f)));
  it.each(sources.map((f) => [relative(ROOT, f), f]))('%s imports with exact case', (_n, file) => {
    expect(importCaseErrors(file)).toEqual([]);
  });

  it('detects collisions (self-check)', () => {
    expect(caseCollisions(['src/ui/a.ts', 'src/ui/A.ts', 'src/ui/b.ts'])).toEqual([['src/ui/a.ts', 'src/ui/A.ts']]);
  });
});
