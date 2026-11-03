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

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
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
