/**
 * Keeps docs/tech/level-format.md aligned with the constants in
 * src/core/types.ts. Owner: tech-lead.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INPUT_BUTTONS, INPUT_LETTERS, PLAYER_START_CHAR, RESERVED_CHARS, TILE_LEGEND } from '../../src/core/types';

const DOC = readFileSync(resolve(import.meta.dirname, '..', '..', 'docs', 'tech', 'level-format.md'), 'utf8');

/** Characters written as inline code inside the doc's legend table rows. */
function legendCharsInDoc(): Set<string> {
  const rows = DOC.split('\n').filter((line) => line.startsWith('| `'));
  const firstCells = rows.map((row) => row.split('|')[1] ?? '');
  return new Set(firstCells.flatMap((cell) => [...cell.matchAll(/`(.)`/g)].map((m) => m[1] ?? '')));
}

const TOKEN_RE = /^[1-9][0-9]*(\.|(?=[LRJ+-])L?R?J?\+?-?)$/;

describe('level-format.md', () => {
  it('documents every legend character and the start marker', () => {
    const documented = legendCharsInDoc();
    for (const c of [...Object.keys(TILE_LEGEND), PLAYER_START_CHAR]) {
      expect(documented, `char "${c}" missing from the legend table`).toContain(c);
    }
  });

  it('mentions each reserved character', () => {
    for (const c of RESERVED_CHARS) {
      expect(DOC).toContain(`\`${c}\``);
    }
  });

  it('token regex matches the canonical button letters', () => {
    const all = `7${INPUT_BUTTONS.map((b) => INPUT_LETTERS[b]).join('')}`;
    expect(DOC).toContain(String.raw`^[1-9][0-9]*(\.|(?=[LRJ+-])L?R?J?\+?-?)$`);
    for (const ok of ['30.', '1R+', '359R', '2LJ', all]) expect(ok).toMatch(TOKEN_RE);
    for (const bad of ['0R', '5', 'R', '3RL', '2R.', '1++']) expect(bad).not.toMatch(TOKEN_RE);
  });
});
