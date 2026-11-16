/**
 * Architecture guard: the QA/replay hook `window.__redshift` must never reach
 * the itch.io build (BUG-1, M1-15). Every use of the global sits on an
 * `if (QA_HOOK)` line, and QA_HOOK is the build-time flag, so Vite inlines it
 * to `false` and the minifier drops the branch. Owner: tech-lead.
 * docs/tech/architecture.md, "QA hook".
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripComments } from './sourceText';

const SRC_DIR = resolve(import.meta.dirname, '..', '..', 'src');
/** The global's name as a whole string literal ('__redshift_probe__' and the like are not the hook). */
const HOOK_LITERAL = /(['"`])__redshift\1/;
const GUARD_LINE = /\bif \(QA_HOOK\)/;
const FLAG_DECL = "const QA_HOOK = import.meta.env.DEV || import.meta.env.VITE_QA_HOOK === '1';";

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts') ? [full] : [];
  });
}

/** Files that name the hook, with every unguarded line as `file:line`. */
function scan(): { readonly files: string[]; readonly unguarded: string[]; readonly missingFlag: string[] } {
  const files: string[] = [];
  const unguarded: string[] = [];
  const missingFlag: string[] = [];
  for (const file of listSourceFiles(SRC_DIR)) {
    const code = stripComments(readFileSync(file, 'utf8'));
    const lines = code.split(/\r?\n/);
    if (!lines.some((l) => HOOK_LITERAL.test(l))) continue;
    const rel = relative(SRC_DIR, file);
    files.push(rel);
    if (!code.includes(FLAG_DECL)) missingFlag.push(rel);
    lines.forEach((l, i) => {
      if (HOOK_LITERAL.test(l) && !GUARD_LINE.test(l)) unguarded.push(`${rel}:${i + 1}`);
    });
  }
  return { files, unguarded, missingFlag };
}

/** Any declaration of a `QA_HOOK` binding (const, let, var). */
const FLAG_BINDING = /\b(?:const|let|var)\s+QA_HOOK\b/;
/** A Vite glob that pulls in the solution recordings (a positive `*.solution.txt` pattern, not a `!` exclusion). */
const SOLUTION_REF = /import\.meta\.glob\(\s*(?:\[[^\]]*?)?['"`][^!'"`]*\.solution\.txt/;

/**
 * C1 (batch 3 review): the flag is declared in more than one file (GameScene,
 * solutionFiles). Until [scene] shares one constant, every copy must be the
 * exact build-time expression, and every file that reaches the recordings
 * must declare it, so a copy cannot drift to a runtime check.
 */
function flagDrift(files: ReadonlyArray<{ readonly rel: string; readonly code: string }>): string[] {
  const problems: string[] = [];
  for (const { rel, code } of files) {
    const declares = FLAG_BINDING.test(code);
    if (declares && !code.includes(FLAG_DECL)) problems.push(`${rel}: QA_HOOK differs from \`${FLAG_DECL}\``);
    if (SOLUTION_REF.test(code) && !code.includes(FLAG_DECL)) {
      problems.push(`${rel}: reaches *.solution.txt without the build-time QA_HOOK flag`);
    }
  }
  return problems;
}

function allSources(): Array<{ readonly rel: string; readonly code: string }> {
  return listSourceFiles(SRC_DIR).map((file) => ({
    rel: relative(SRC_DIR, file),
    code: stripComments(readFileSync(file, 'utf8')),
  }));
}

describe('QA_HOOK flag copies (C1)', () => {
  it('every QA_HOOK declaration and every recording reference uses the build-time flag', () => {
    const sources = allSources();
    // Else this guard checks nothing: solutionFiles.ts bundles the recordings today.
    expect(sources.filter((s) => SOLUTION_REF.test(s.code)).length).toBeGreaterThan(0);
    expect(flagDrift(sources)).toEqual([]);
  });

  it('self-check: a drifted copy or an unguarded recording glob is flagged', () => {
    const glob = "const f = import.meta.glob('/levels/*.solution.txt');";
    expect(flagDrift([{ rel: 'a.ts', code: "const QA_HOOK = import.meta.env.DEV;" }])).toHaveLength(1);
    expect(flagDrift([{ rel: 'b.ts', code: glob }])).toHaveLength(1);
    expect(flagDrift([{ rel: 'c.ts', code: `${FLAG_DECL}\nconst x = QA_HOOK ? ${glob} : {};` }])).toEqual([]);
  });
});

describe('QA hook gating', () => {
  const result = scan();

  it('the hook is still installed somewhere (else this guard is checking nothing)', () => {
    expect(result.files.length).toBeGreaterThan(0);
  });

  it('every file that names window.__redshift declares the build-time QA_HOOK flag', () => {
    expect(result.missingFlag, `declare: ${FLAG_DECL}`).toEqual([]);
  });

  it("every '__redshift' use is on an `if (QA_HOOK)` line", () => {
    expect(result.unguarded).toEqual([]);
  });
});
