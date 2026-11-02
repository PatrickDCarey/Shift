/**
 * Architecture guard: src/core must stay pure and deterministic
 * (CLAUDE.md hard rules, docs/tech/architecture.md). Owner: tech-lead.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_DIR = resolve(import.meta.dirname, '..', '..', 'src');
const CORE_DIR = join(SRC_DIR, 'core');
const DATA_DIR = join(SRC_DIR, 'data');

/** Bare-specifier packages src/core may import. Keep empty unless tech-lead approves. */
const ALLOWED_PACKAGES: readonly string[] = [];

const FORBIDDEN_APIS: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  { pattern: /\bMath\.random\b/, why: 'Math.random (keep a seeded PRNG in sim state)' },
  { pattern: /\bDate\b/, why: 'Date / wall-clock time' },
  { pattern: /\bperformance\b/, why: 'performance.now / wall-clock time' },
  { pattern: /\b(window|document|navigator|localStorage|requestAnimationFrame)\b/, why: 'browser API' },
  { pattern: /\b(setTimeout|setInterval)\b/, why: 'timers' },
];

const IMPORT_RE = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [full] : [];
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function isInside(path: string, dir: string): boolean {
  return path === dir || path.startsWith(dir + sep);
}

function importViolation(file: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return ALLOWED_PACKAGES.includes(specifier) ? null : `imports package "${specifier}"`;
  }
  const target = resolve(dirname(file), specifier);
  if (isInside(target, CORE_DIR)) return null;
  if (isInside(target, DATA_DIR) && target.endsWith('.json')) return null;
  return `imports "${specifier}" from outside src/core`;
}

function findViolations(file: string): string[] {
  const code = stripComments(readFileSync(file, 'utf8'));
  const imports = [...code.matchAll(IMPORT_RE)].flatMap((m) => {
    const v = importViolation(file, m[1] ?? '');
    return v ? [v] : [];
  });
  const apis = code.split('\n').flatMap((line, i) =>
    FORBIDDEN_APIS.filter(({ pattern }) => pattern.test(line)).map(({ why }) => `line ${i + 1}: ${why}`),
  );
  return [...imports, ...apis];
}

describe('src/core purity', () => {
  const files = listSourceFiles(CORE_DIR);

  it('finds the core sources', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [relative(SRC_DIR, f), f]))('%s is deterministic and Phaser-free', (_name, file) => {
    expect(findViolations(file)).toEqual([]);
  });

  it('flags a forbidden import and API (self-check)', () => {
    expect(importViolation(join(CORE_DIR, 'x.ts'), 'phaser')).not.toBeNull();
    expect(importViolation(join(CORE_DIR, 'x.ts'), '../scenes/GameScene')).not.toBeNull();
    expect(importViolation(join(CORE_DIR, 'sub', 'x.ts'), '../types')).toBeNull();
    expect(importViolation(join(CORE_DIR, 'x.ts'), '../data/tuning.json')).toBeNull();
    expect(FORBIDDEN_APIS.some(({ pattern }) => pattern.test('const r = Math.random();'))).toBe(true);
  });
});
