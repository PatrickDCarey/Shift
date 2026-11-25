/**
 * Style guard: player-facing text uses British spelling (owner's ruling,
 * 2026-11-25: "Colour, not color"). Owner: tech-lead.
 * docs/tech/architecture.md, "British spelling".
 *
 * Narrow on purpose, so identifiers never trip it: it reads only string and
 * template literals that contain a space (prose, never a key, tile kind or CSS
 * value such as 'colored' or 'center'), with `${...}` expressions removed,
 * from the display layers (`src/ui`, `src/scenes`, `src/entities`) and
 * `index.html`, plus the `title:` header of every level (shown on level
 * select, HUD, pause and results). Comments are stripped first.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stripComments } from './sourceText';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DISPLAY_DIRS = ['src/ui', 'src/scenes', 'src/entities'];
const LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
const TEMPLATE_EXPR = /\$\{[^}]*\}/g;
/** American spellings this game's text is likely to use. */
const AMERICAN = /\b(?:[Cc]olor(?:s|ed|ful|ing|blind)?|[Gg]ray(?:s|ed)?|[Cc]enter(?:s|ed)?|[Bb]ehaviors?|[Ff]avorites?|[Hh]onors?)\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [path] : [];
  });
}

/** Prose literals (with a space) in `text` that use an American spelling. */
export function americanProse(text: string): string[] {
  const literals = stripComments(text).match(LITERAL) ?? [];
  return literals.map((l) => l.replace(TEMPLATE_EXPR, '')).filter((l) => l.includes(' ') && AMERICAN.test(l));
}

describe('British spelling in display text', () => {
  it('flags prose literals only, not identifiers', () => {
    expect(americanProse("const k = 'colored'; const a = 'center'; // a color comment")).toEqual([]);
    expect(americanProse('const t = `band ${tile.color} holds`;')).toEqual([]);
    expect(americanProse("const s = 'Match your color';")).toEqual(["'Match your color'"]);
    expect(americanProse("const s = 'Match your colour';")).toEqual([]);
  });

  it('src/ui, src/scenes, src/entities and index.html use British spelling in prose strings', () => {
    const files = [...DISPLAY_DIRS.flatMap((d) => sourceFiles(join(ROOT, d))), join(ROOT, 'index.html')];
    const problems = files.flatMap((f) => americanProse(readFileSync(f, 'utf8')).map((l) => `${relative(ROOT, f)}: ${l}`));
    expect(problems).toEqual([]);
  });

  it('level titles use British spelling', () => {
    const dir = join(ROOT, 'levels');
    const titles = readdirSync(dir)
      .filter((n) => n.endsWith('.txt') && !n.endsWith('.solution.txt'))
      .flatMap((n) => (readFileSync(join(dir, n), 'utf8').match(/^title:.*$/m) ?? []).map((t) => `${n}: ${t}`));
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.filter((t) => AMERICAN.test(t))).toEqual([]);
  });
});
