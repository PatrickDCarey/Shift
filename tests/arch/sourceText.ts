/**
 * Source-text helpers for the text-based arch tests. Owner: tech-lead.
 *
 * `stripComments` walks the text once and skips string and template literals,
 * so a glob such as `'/levels/*.solution.txt'` or a URL `'https://x'` inside a
 * string is never read as the start of a comment (batch 3 review, T4).
 * Line breaks inside removed block comments are kept, so line numbers stay true.
 */

type Mode = 'code' | 'line' | 'block' | "'" | '"' | '`';

function nextMode(ch: string, next: string): Mode | null {
  if (ch === '/' && next === '/') return 'line';
  if (ch === '/' && next === '*') return 'block';
  if (ch === "'" || ch === '"' || ch === '`') return ch;
  return null;
}

/** The source with `//` and block comments removed; literals are left intact. */
export function stripComments(source: string): string {
  let out = '';
  let mode: Mode = 'code';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i] ?? '';
    const next = source[i + 1] ?? '';
    if (mode === 'code') {
      const entered = nextMode(ch, next);
      if (entered === 'line' || entered === 'block') {
        mode = entered;
        i += 1;
        continue;
      }
      if (entered !== null) mode = entered;
      out += ch;
    } else if (mode === 'line') {
      if (ch === '\n') {
        mode = 'code';
        out += ch;
      }
    } else if (mode === 'block') {
      if (ch === '*' && next === '/') {
        mode = 'code';
        i += 1;
      } else if (ch === '\n') out += ch;
    } else {
      // Inside a string or template literal: copy, honour escapes, close on the quote.
      out += ch;
      if (ch === '\\') {
        out += next;
        i += 1;
      } else if (ch === mode) mode = 'code';
    }
  }
  return out;
}
