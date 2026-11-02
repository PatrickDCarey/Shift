/**
 * Architecture guard: src/core must stay pure and deterministic, and its lanes
 * talk only through published contracts (CLAUDE.md hard rules,
 * docs/tech/architecture.md §2, §3.5). Owner: tech-lead.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANE_IMPORTS, type LaneName } from '../../src/core/types';

const SRC_DIR = resolve(import.meta.dirname, '..', '..', 'src');
const CORE_DIR = join(SRC_DIR, 'core');
const DATA_DIR = join(SRC_DIR, 'data');
const CONTRACTS_DIR = join(CORE_DIR, 'contracts');
const LANES = Object.keys(LANE_IMPORTS) as LaneName[];
/** Non-test files allowed directly in src/core; everything else lives in a lane or contracts/. */
const CORE_ROOT_FILES = ['types.ts', 'index.ts'];

/** Bare-specifier packages src/core may import. Keep empty unless tech-lead approves. */
const ALLOWED_PACKAGES: readonly string[] = [];

const FORBIDDEN_APIS: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  { pattern: /\bMath\.random\b/, why: 'Math.random (keep a seeded PRNG in sim state)' },
  { pattern: /\bDate\b/, why: 'Date / wall-clock time' },
  { pattern: /\bperformance\b/, why: 'performance.now / wall-clock time' },
  { pattern: /\b(window|document|navigator|localStorage|requestAnimationFrame)\b/, why: 'browser API' },
  { pattern: /\b(setTimeout|setInterval)\b/, why: 'timers' },
  { pattern: /\bimport\.meta\b/, why: 'import.meta (Vite/Node specific; pass data in instead)' },
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

/** Path without a .ts/.js extension and without a trailing /index. */
function moduleId(path: string): string {
  const noExt = path.replace(/\.(ts|js)$/, '');
  return basename(noExt) === 'index' ? dirname(noExt) : noExt;
}

type Zone = LaneName | 'types' | 'barrel' | 'contracts' | 'stray';

function zoneOf(path: string): Zone {
  const lane = LANES.find((l) => isInside(path, join(CORE_DIR, l)));
  if (lane) return lane;
  if (isInside(path, CONTRACTS_DIR)) return 'contracts';
  const id = moduleId(path);
  if (id === join(CORE_DIR, 'types')) return 'types';
  if (id === CORE_DIR) return 'barrel';
  return 'stray';
}

/** Allowed iff the target is inside src/core: decides by importer and target zone. */
function coreImportViolation(fromZone: Zone, target: string, specifier: string): string | null {
  const toZone = zoneOf(target);
  if (fromZone === toZone) return null;
  const ok =
    (toZone === 'contracts' && (fromZone === 'types' || fromZone === 'contracts')) ||
    (toZone === 'types' && LANES.includes(fromZone as LaneName)) ||
    (fromZone === 'barrel' && (toZone === 'types' || moduleId(target) === join(CORE_DIR, toZone))) ||
    (LANES.includes(fromZone as LaneName) &&
      LANES.includes(toZone as LaneName) &&
      LANE_IMPORTS[fromZone as LaneName].includes(toZone as LaneName) &&
      moduleId(target) === join(CORE_DIR, toZone));
  return ok ? null : `${fromZone} may not import "${specifier}" (${toZone})`;
}

function importViolation(file: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return ALLOWED_PACKAGES.includes(specifier) ? null : `imports package "${specifier}"`;
  }
  const target = resolve(dirname(file), specifier);
  const fromZone = zoneOf(file);
  if (isInside(target, CORE_DIR)) return coreImportViolation(fromZone, target, specifier);
  if (isInside(target, DATA_DIR) && target.endsWith('.json') && fromZone === 'sim') return null;
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
  const stray = zoneOf(file) === 'stray' ? ['not in a lane: move it under src/core/{sim,motion,level}/'] : [];
  return [...stray, ...imports, ...apis];
}

/** Imports from outside src/core may target only the barrel or types.ts. */
function outsideViolations(file: string): string[] {
  const code = stripComments(readFileSync(file, 'utf8'));
  return [...code.matchAll(IMPORT_RE)].flatMap((m) => {
    const spec = m[1] ?? '';
    if (!spec.startsWith('.')) return [];
    const target = resolve(dirname(file), spec);
    if (!isInside(target, CORE_DIR)) return [];
    const zone = zoneOf(target);
    return zone === 'barrel' || zone === 'types' ? [] : [`imports "${spec}": use src/core (barrel) or src/core/types`];
  });
}

describe('src/core purity and lanes', () => {
  const files = listSourceFiles(CORE_DIR);

  it('finds the core sources, every lane entry and only allowed root files', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const lane of LANES) expect(files).toContain(join(CORE_DIR, lane, 'index.ts'));
    const rootFiles = readdirSync(CORE_DIR).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'));
    expect(rootFiles.sort()).toEqual([...CORE_ROOT_FILES].sort());
  });

  it.each(files.map((f) => [relative(SRC_DIR, f), f]))('%s is deterministic, Phaser-free and in its lane', (_n, file) => {
    expect(findViolations(file)).toEqual([]);
  });

  const outside = listSourceFiles(SRC_DIR).filter((f) => !isInside(f, CORE_DIR));
  it.each(outside.map((f) => [relative(SRC_DIR, f), f]))('%s imports the core only via its barrel or types', (_n, file) => {
    expect(outsideViolations(file)).toEqual([]);
  });

  it('flags forbidden imports and APIs (self-check)', () => {
    const at = (...p: string[]): string => join(CORE_DIR, ...p);
    expect(importViolation(at('sim', 'x.ts'), 'phaser')).not.toBeNull();
    expect(importViolation(at('sim', 'x.ts'), '../../scenes/GameScene')).not.toBeNull();
    expect(importViolation(at('sim', 'x.ts'), '../types')).toBeNull();
    expect(importViolation(at('sim', 'deep', 'x.ts'), '../step')).toBeNull();
    expect(importViolation(at('sim', 'x.ts'), '../../data/tuning.json')).toBeNull();
    expect(importViolation(at('motion', 'x.ts'), '../../data/tuning.json')).not.toBeNull();
    expect(importViolation(at('sim', 'x.ts'), '../motion')).toBeNull();
    expect(importViolation(at('sim', 'x.ts'), '../motion/index')).toBeNull();
    expect(importViolation(at('sim', 'x.ts'), '../motion/ground')).not.toBeNull();
    expect(importViolation(at('level', 'x.ts'), '../sim')).not.toBeNull();
    expect(importViolation(at('motion', 'x.ts'), '../sim')).not.toBeNull();
    expect(importViolation(at('sim', 'x.ts'), '../contracts/state')).not.toBeNull();
    expect(importViolation(at('sim', 'x.ts'), '..')).not.toBeNull();
    expect(importViolation(at('index.ts'), './level')).toBeNull();
    expect(importViolation(at('index.ts'), './level/parse')).not.toBeNull();
    expect(importViolation(at('types.ts'), './contracts/bands')).toBeNull();
    expect(zoneOf(at('helpers.ts'))).toBe('stray');
    expect(FORBIDDEN_APIS.some(({ pattern }) => pattern.test('const r = Math.random();'))).toBe(true);
  });
});
