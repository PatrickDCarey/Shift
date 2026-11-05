/**
 * Architecture guard for the render-side reactors and the optional network
 * client (architecture.md §2, §3 "fall-through" ruling, §8). Owner: tech-lead.
 *
 * 1. `src/audio`, `src/fx` and `src/net` import from `src/core` with
 *    `import type` / `export type` only: they react to `SimState` and
 *    `SimEvent`s handed to them and never run sim code themselves
 *    (adaptive-audio.md checks 11 and 14; T-07 ruling).
 * 2. Nothing outside `src/net` imports `src/net` statically. The game loads it
 *    with a dynamic `import()` only when both Supabase values are set, so an
 *    offline build never ships the client. `import type` is allowed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_DIR = resolve(import.meta.dirname, '..', '..', 'src');
const CORE_DIR = join(SRC_DIR, 'core');
const NET_DIR = join(SRC_DIR, 'net');
const TYPE_ONLY_AREAS = ['audio', 'fx', 'net'];

/** Static import/export-from statements (multi-line safe) and their specifiers. */
const STATIC_RE = /^\s*(import|export)\s+(type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gm;

interface StaticImport {
  readonly typeOnly: boolean;
  readonly target: string;
}

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

/** Static imports of one source text, resolved against `file`; bare specifiers are skipped. */
function staticImports(file: string, source: string): readonly StaticImport[] {
  return [...stripComments(source).matchAll(STATIC_RE)]
    .filter((m) => (m[3] ?? '').startsWith('.'))
    .map((m) => ({ typeOnly: m[2] !== undefined, target: resolve(dirname(file), m[3] ?? '') }));
}

const isInside = (path: string, dir: string): boolean => path === dir || path.startsWith(dir + sep);
const rel = (path: string): string => relative(SRC_DIR, path).split(sep).join('/');

function valueImportsOfCore(file: string, source: string): readonly string[] {
  return staticImports(file, source)
    .filter((imp) => !imp.typeOnly && isInside(imp.target, CORE_DIR))
    .map((imp) => `${rel(file)} imports a value from ${rel(imp.target)}; use \`import type\``);
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

  it('flags a static net import and allows a dynamic one or a type import', () => {
    expect(staticNetImports(sceneFile, "import { getNetClient } from '../net';")).toHaveLength(1);
    expect(staticNetImports(sceneFile, "import '../net/client';")).toHaveLength(1);
    expect(staticNetImports(sceneFile, "const net = await import('../net');")).toEqual([]);
    expect(staticNetImports(sceneFile, "import type { NetClient } from '../net';")).toEqual([]);
  });
});
