/**
 * Architecture guard: the QA/replay hook `window.__redshift` and the bundled
 * solution recordings (`?replay=1`) must never reach the itch.io build (BUG-1,
 * BUG-4, M1-15). Every use of the global sits on an `if (QA_HOOK)` line, and
 * QA_HOOK is the build-time flag, so Vite inlines it to `false` and the
 * minifier drops the branch. Owner: tech-lead.
 * docs/tech/architecture.md, "QA hook".
 *
 * Where the flag comes from (C1, B6-02). Two layouts pass:
 * - before B6-27: each file that needs it declares the exact `FLAG_DECL` inline;
 * - after B6-27: `src/entities/qaHook.ts` exports it once (`export const` +
 *   `FLAG_DECL`), it is the only declaration in `src/`, and every file that
 *   needs it imports `QA_HOOK` (not renamed, not type-only) from that module.
 * Mixing them (the module exists and a file still declares its own) fails.
 * `npm run package` re-checks the built files for the hook name and recording
 * headers (scripts/lib/checks.mjs), so a flag that stops folding is caught too.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripComments } from './sourceText';

const SRC_DIR = resolve(import.meta.dirname, '..', '..', 'src');
/** The single home of the flag once the scene lane moves it (B6-27). */
const FLAG_MODULE = join('entities', 'qaHook.ts');
/** The global's name as a whole string literal ('__redshift_probe__' and the like are not the hook). */
const HOOK_LITERAL = /(['"`])__redshift\1/;
const GUARD_LINE = /\bif \(QA_HOOK\)/;
const FLAG_DECL = "const QA_HOOK = import.meta.env.DEV || import.meta.env.VITE_QA_HOOK === '1';";
const EXPORTED_FLAG_DECL = `export ${FLAG_DECL}`;
/** Any declaration of a `QA_HOOK` binding (const, let, var). */
const FLAG_BINDING = /\b(?:const|let|var)\s+QA_HOOK\b/g;
/** A Vite glob that pulls in the solution recordings (a positive `*.solution.txt` pattern, not a `!` exclusion). */
const SOLUTION_REF = /import\.meta\.glob\(\s*(?:\[[^\]]*?)?['"`][^!'"`]*\.solution\.txt/;
/** Value imports with a braced specifier list (type-only imports are skipped by the leading `import\s+{`). */
const NAMED_IMPORT = /import\s*\{([^}]*)\}\s*from\s*(['"])([^'"]+)\2/g;

interface Source {
  readonly rel: string;
  readonly code: string;
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts') ? [full] : [];
  });
}

function allSources(): Source[] {
  return listSourceFiles(SRC_DIR).map((file) => ({
    rel: relative(SRC_DIR, file),
    code: stripComments(readFileSync(file, 'utf8')),
  }));
}

const withoutTsExt = (p: string): string => p.replace(/\.(?:ts|js)$/, '');

/** True when `code` (in file `rel`) has `import { QA_HOOK } from '<path to FLAG_MODULE>'`, unrenamed. */
function importsSharedFlag({ rel, code }: Source): boolean {
  const target = withoutTsExt(resolve(SRC_DIR, FLAG_MODULE));
  for (const m of code.matchAll(NAMED_IMPORT)) {
    const spec = m[3] as string;
    if (!spec.startsWith('.')) continue;
    if (withoutTsExt(resolve(dirname(resolve(SRC_DIR, rel)), spec)) !== target) continue;
    const names = (m[1] as string).split(',').map((s) => s.trim().replace(/^type\s+/, '(type) '));
    if (names.includes('QA_HOOK')) return true;
  }
  return false;
}

const needsFlag = ({ code }: Source): boolean => SOLUTION_REF.test(code) || HOOK_LITERAL.test(code);
const declarations = (code: string): number => [...code.matchAll(FLAG_BINDING)].length;

/** Every way the flag's origin can drift, as readable messages; empty means sound. */
function flagDrift(sources: readonly Source[]): string[] {
  const shared = sources.find((s) => s.rel === FLAG_MODULE);
  const problems: string[] = [];
  if (shared && (declarations(shared.code) !== 1 || !shared.code.includes(EXPORTED_FLAG_DECL))) {
    problems.push(`${shared.rel}: must declare QA_HOOK exactly once as \`${EXPORTED_FLAG_DECL}\``);
  }
  for (const s of sources) {
    if (s === shared) continue;
    const declares = declarations(s.code) > 0;
    if (declares && shared) problems.push(`${s.rel}: declares QA_HOOK; import it from ${FLAG_MODULE} instead`);
    if (declares && !s.code.includes(FLAG_DECL)) problems.push(`${s.rel}: QA_HOOK differs from \`${FLAG_DECL}\``);
    if (!needsFlag(s)) continue;
    const ok = shared ? importsSharedFlag(s) : s.code.includes(FLAG_DECL);
    if (!ok) problems.push(`${s.rel}: reaches the hook or *.solution.txt without the build-time QA_HOOK flag`);
  }
  return problems;
}

/** Lines that name the hook without sitting on an `if (QA_HOOK)` line, as `file:line`. */
function unguardedUses(sources: readonly Source[]): string[] {
  return sources.flatMap(({ rel, code }) =>
    code
      .split(/\r?\n/)
      .flatMap((l, i) => (HOOK_LITERAL.test(l) && !GUARD_LINE.test(l) ? [`${rel}:${i + 1}`] : [])),
  );
}

describe('QA_HOOK flag origin (C1, B6-02)', () => {
  const sources = allSources();

  it('the hook and the recordings are still referenced (else this guard checks nothing)', () => {
    expect(sources.some((s) => HOOK_LITERAL.test(s.code))).toBe(true);
    expect(sources.some((s) => SOLUTION_REF.test(s.code))).toBe(true);
  });

  it('every file that reaches the hook or the recordings gets the build-time flag', () => {
    expect(flagDrift(sources)).toEqual([]);
  });
});

describe('QA_HOOK flag origin (self-check)', () => {
  const glob = "const f = QA_HOOK ? import.meta.glob('/levels/*.solution.txt') : {};";
  const shared: Source = { rel: FLAG_MODULE, code: EXPORTED_FLAG_DECL };
  const user = (rel: string, imp: string): Source => ({ rel, code: `${imp}\n${glob}` });

  it('inline layout: exact copies pass, a drifted or missing copy fails', () => {
    expect(flagDrift([{ rel: 'c.ts', code: `${FLAG_DECL}\n${glob}` }])).toEqual([]);
    expect(flagDrift([{ rel: 'a.ts', code: 'const QA_HOOK = import.meta.env.DEV;' }])).toHaveLength(1);
    expect(flagDrift([{ rel: 'b.ts', code: glob }])).toHaveLength(1);
  });

  it('shared layout: imports from the module pass from any folder', () => {
    const scene = join('scenes', 'GameScene.ts');
    const files = join('entities', 'solutionFiles.ts');
    expect(
      flagDrift([
        shared,
        user(scene, "import { foo, QA_HOOK } from '../entities/qaHook';"),
        user(files, "import { QA_HOOK } from './qaHook.ts';"),
      ]),
    ).toEqual([]);
  });

  it('shared layout: a local copy, a renamed, type-only or wrong-module import fails', () => {
    const rel = join('entities', 'solutionFiles.ts');
    const bad = [
      user(rel, `${FLAG_DECL}`),
      user(rel, "import { QA_HOOK as Q } from './qaHook';"),
      user(rel, "import { type QA_HOOK } from './qaHook';"),
      user(rel, "import { QA_HOOK } from './otherHook';"),
      user(rel, ''),
    ];
    for (const s of bad) expect(flagDrift([shared, s]), s.code).not.toEqual([]);
  });

  it('shared layout: the module itself must export the exact flag once', () => {
    expect(flagDrift([{ rel: FLAG_MODULE, code: 'export const QA_HOOK = true;' }])).toHaveLength(1);
    expect(flagDrift([{ rel: FLAG_MODULE, code: `${EXPORTED_FLAG_DECL}\nlet QA_HOOK = true;` }])).toHaveLength(1);
  });
});

describe('QA hook gating', () => {
  const sources = allSources();

  it('the hook is still installed somewhere (else this guard is checking nothing)', () => {
    expect(sources.some((s) => HOOK_LITERAL.test(s.code))).toBe(true);
  });

  it("every '__redshift' use is on an `if (QA_HOOK)` line", () => {
    expect(unguardedUses(sources)).toEqual([]);
  });

  it('self-check: an unguarded use is reported with its line', () => {
    const code = "if (QA_HOOK) install('__redshift');\nwindow['__redshift'] = 1;";
    expect(unguardedUses([{ rel: 'x.ts', code }])).toEqual(['x.ts:2']);
  });
});
