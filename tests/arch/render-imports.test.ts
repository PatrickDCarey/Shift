/**
 * Architecture guard for the render-side reactors and the optional network
 * client (architecture.md §2, §3 "fall-through" ruling, §8). Owner: tech-lead.
 *
 * 1. `src/audio`, `src/fx` and `src/net` import from `src/core` with
 *    `import type` / `export type` only: they react to `SimState` and
 *    `SimEvent`s handed to them and never run sim code themselves
 *    (adaptive-audio.md checks 11 and 14; T-07 ruling).
 *    A dynamic `import('../core')` is a value import too and is flagged.
 *    One exception (batch 6 review, item 1): `src/net` may value-import the
 *    leaderboard contract's own values (`src/core/contracts/leaderboard.ts`:
 *    `isDisplayName` and the name constants) through `src/core/types`, by name
 *    in a braced import, so the client and the rule share one source. That
 *    file imports nothing, and the `types.ts` barrel reaches only
 *    `contracts/**`, so no sim, motion or level code is reachable from net.
 * 2. Nothing outside `src/net` imports `src/net` statically. The game loads it
 *    with a dynamic `import()` only when both Supabase values are set, so an
 *    offline build never ships the client. `import type` is allowed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripComments } from './sourceText';

const SRC_DIR = resolve(import.meta.dirname, '..', '..', 'src');
const CORE_DIR = join(SRC_DIR, 'core');
const NET_DIR = join(SRC_DIR, 'net');
const CONTRACTS_DIR = join(CORE_DIR, 'contracts');
const TYPES_BARREL = join(CORE_DIR, 'types');
const LEADERBOARD_FILE = join(CONTRACTS_DIR, 'leaderboard.ts');
const TYPE_ONLY_AREAS = ['audio', 'fx', 'net'];

/** Static import/export-from statements (multi-line safe): kind, `type`, clause, specifier. */
const STATIC_RE = /^\s*(import|export)\s+(type\s+)?(?:([^'";]*?)\s+from\s+)?['"]([^'"]+)['"]/gm;
/** Dynamic `import('...')` calls with a literal specifier. */
const DYNAMIC_RE = /\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
/** Exported value names of a module (`export const` / `export function`). */
const VALUE_EXPORT_RE = /^export\s+(?:const|function)\s+(\w+)/gm;

interface StaticImport {
  readonly isImport: boolean;
  readonly typeOnly: boolean;
  readonly clause: string;
  readonly target: string;
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [full] : [];
  });
}

/** Static imports of one source text, resolved against `file`; bare specifiers are skipped. */
function staticImports(file: string, source: string): readonly StaticImport[] {
  return [...stripComments(source).matchAll(STATIC_RE)]
    .filter((m) => (m[4] ?? '').startsWith('.'))
    .map((m) => ({
      isImport: m[1] === 'import',
      typeOnly: m[2] !== undefined,
      clause: (m[3] ?? '').trim(),
      target: resolve(dirname(file), m[4] ?? ''),
    }));
}

/** The value names the leaderboard contract exports: the only core values `src/net` may import. */
function leaderboardValues(): ReadonlySet<string> {
  return new Set([...stripComments(read(LEADERBOARD_FILE)).matchAll(VALUE_EXPORT_RE)].map((m) => m[1] ?? ''));
}

/**
 * True for `import { isDisplayName, type X } from '../core/types'` in `src/net`
 * when every non-type name is a leaderboard contract value. Default, namespace
 * and side-effect imports, re-exports and any other core path stay flagged.
 */
function isAllowedNetImport(file: string, imp: StaticImport, allowed: ReadonlySet<string>): boolean {
  if (!isInside(file, NET_DIR) || !imp.isImport || imp.target !== TYPES_BARREL) return false;
  const braces = /^\{([^}]*)\}$/.exec(imp.clause);
  if (braces === null) return false;
  const names = (braces[1] ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '' && !part.startsWith('type '))
    .map((part) => part.split(/\s+as\s+/)[0] ?? '');
  return names.length > 0 && names.every((name) => allowed.has(name));
}

/** Relative dynamic imports of one source text, resolved against `file`. */
function dynamicImports(file: string, source: string): readonly string[] {
  return [...stripComments(source).matchAll(DYNAMIC_RE)]
    .map((m) => m[1] ?? '')
    .filter((spec) => spec.startsWith('.'))
    .map((spec) => resolve(dirname(file), spec));
}

const isInside = (path: string, dir: string): boolean => path === dir || path.startsWith(dir + sep);
const rel = (path: string): string => relative(SRC_DIR, path).split(sep).join('/');

function valueImportsOfCore(file: string, source: string, allowed: ReadonlySet<string> = leaderboardValues()): readonly string[] {
  const fromStatic = staticImports(file, source)
    .filter((imp) => !imp.typeOnly && isInside(imp.target, CORE_DIR))
    .filter((imp) => !isAllowedNetImport(file, imp, allowed))
    .map((imp) => `${rel(file)} imports a value from ${rel(imp.target)}; use \`import type\``);
  const fromDynamic = dynamicImports(file, source)
    .filter((target) => isInside(target, CORE_DIR))
    .map((target) => `${rel(file)} imports ${rel(target)} dynamically; use \`import type\``);
  return [...fromStatic, ...fromDynamic];
}

function staticNetImports(file: string, source: string): readonly string[] {
  if (isInside(file, NET_DIR)) return [];
  return staticImports(file, source)
    .filter((imp) => !imp.typeOnly && isInside(imp.target, NET_DIR))
    .map((imp) => `${rel(file)} imports ${rel(imp.target)} statically; use \`await import()\` (architecture.md §8)`);
}

const read = (file: string): string => readFileSync(file, 'utf8');

describe('render-side and net imports', () => {
  it('audio, fx and net import only types from src/core', () => {
    const files = TYPE_ONLY_AREAS.flatMap((area) => listSourceFiles(join(SRC_DIR, area)));
    expect(files.length).toBeGreaterThan(0);
    expect(files.flatMap((f) => valueImportsOfCore(f, read(f)))).toEqual([]);
  });

  it('nothing outside src/net imports it statically', () => {
    expect(listSourceFiles(SRC_DIR).flatMap((f) => staticNetImports(f, read(f)))).toEqual([]);
  });

  it('the net exception reaches no sim code: leaderboard.ts imports nothing, types.ts only contracts', () => {
    expect(staticImports(LEADERBOARD_FILE, read(LEADERBOARD_FILE))).toEqual([]);
    expect(dynamicImports(LEADERBOARD_FILE, read(LEADERBOARD_FILE))).toEqual([]);
    const barrel = [`${TYPES_BARREL}.ts`, ...listSourceFiles(CONTRACTS_DIR)];
    const escapes = barrel.flatMap((f) =>
      [...staticImports(f, read(f)).map((imp) => imp.target), ...dynamicImports(f, read(f))]
        .filter((target) => !isInside(target, CONTRACTS_DIR))
        .map((target) => `${rel(f)} imports ${rel(target)}`),
    );
    expect(escapes).toEqual([]);
    expect([...leaderboardValues()]).toContain('isDisplayName');
  });
});

describe('render-imports self-check', () => {
  const audioFile = join(SRC_DIR, 'audio', 'x.ts');
  const sceneFile = join(SRC_DIR, 'scenes', 'x.ts');

  it('flags a value import of core and passes a multi-line type import', () => {
    const typeOnly = "import type {\n  SimEvent,\n  Band,\n} from '../core/types';";
    expect(valueImportsOfCore(audioFile, typeOnly)).toEqual([]);
    expect(valueImportsOfCore(audioFile, "import { step } from '../core';")).toEqual([
      'audio/x.ts imports a value from core; use `import type`',
    ]);
    expect(valueImportsOfCore(audioFile, "export { MAX_GEAR } from '../core/types';")).toHaveLength(1);
  });

  it('flags a dynamic import of core (T4)', () => {
    expect(valueImportsOfCore(audioFile, "const core = await import('../core');")).toEqual([
      'audio/x.ts imports core dynamically; use `import type`',
    ]);
    expect(valueImportsOfCore(audioFile, "const t = await import('./tone');")).toEqual([]);
  });

  it('a glob string is not read as a comment, so the import after it is still seen (T4)', () => {
    const src = "const g = '/levels/*.solution.txt';\nimport { step } from '../core';\nconst h = '*/';";
    expect(valueImportsOfCore(audioFile, src)).toHaveLength(1);
    expect(stripComments('a // c\nb /* x\ny */ c')).toBe('a \nb \n c');
  });

  it('net may value-import only leaderboard contract names from core/types (batch 6 item 1)', () => {
    const netFile = join(SRC_DIR, 'net', 'x.ts');
    const fxFile = join(SRC_DIR, 'fx', 'x.ts');
    const allowed = new Set(['isDisplayName', 'DISPLAY_NAME_MAX_LENGTH']);
    const ok = "import {\n  isDisplayName,\n  type LevelId,\n  DISPLAY_NAME_MAX_LENGTH as MAX,\n} from '../core/types';";
    expect(valueImportsOfCore(netFile, ok, allowed)).toEqual([]);
    expect(valueImportsOfCore(netFile, "import { isDisplayName, createSim } from '../core/types';", allowed)).toHaveLength(1);
    expect(valueImportsOfCore(netFile, "import { isDisplayName } from '../core';", allowed)).toHaveLength(1);
    expect(valueImportsOfCore(netFile, "import { isDisplayName } from '../core/contracts/leaderboard';", allowed)).toHaveLength(1);
    expect(valueImportsOfCore(netFile, "import * as t from '../core/types';", allowed)).toHaveLength(1);
    expect(valueImportsOfCore(netFile, "export { isDisplayName } from '../core/types';", allowed)).toHaveLength(1);
    expect(valueImportsOfCore(fxFile, "import { isDisplayName } from '../core/types';", allowed)).toHaveLength(1);
  });

  it('flags a static net import and allows a dynamic one or a type import', () => {
    expect(staticNetImports(sceneFile, "import { getNetClient } from '../net';")).toHaveLength(1);
    expect(staticNetImports(sceneFile, "import '../net/client';")).toHaveLength(1);
    expect(staticNetImports(sceneFile, "const net = await import('../net');")).toEqual([]);
    expect(staticNetImports(sceneFile, "import type { NetClient } from '../net';")).toEqual([]);
  });
});
