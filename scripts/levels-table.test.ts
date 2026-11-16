// Drift check: the submit-run LEVELS table must match each level file's `version:` header and
// the "Fastest known" line in levels/README.md. Owner: backend-engineer. Reads files only.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../backend/functions/submit-run/rules';

const dir = new URL('../levels/', import.meta.url);
const readme = readFileSync(new URL('README.md', dir), 'utf8');

function fastestKnown(id: string): number | null {
  const start = readme.search(new RegExp(`^## ${id} `, 'm'));
  if (start < 0) return null;
  const rest = readme.slice(start + 3);
  const end = rest.search(/^## /m);
  const m = /\*\*Fastest known:\*\*\s*(\d+) steps/.exec(end < 0 ? rest : rest.slice(0, end));
  return m ? Number(m[1]) : null;
}

const shipped = readdirSync(dir)
  .map((f) => /^(w[1-9]-\d\d)\.txt$/.exec(f)?.[1])
  .filter((id): id is string => id !== undefined);

describe('LEVELS table matches the level files', () => {
  it('lists every shipped (world 1+) level', () => {
    expect(Object.keys(LEVELS).sort()).toEqual([...shipped].sort());
  });
  it.each(shipped)('%s: version and fastest known', (id) => {
    const text = readFileSync(new URL(`${id}.txt`, dir), 'utf8');
    const version = /^version:\s*(\d+)\s*$/m.exec(text);
    expect(version, `${id}.txt has a version header`).not.toBeNull();
    expect(LEVELS[id]?.version).toBe(Number(version?.[1]));
    expect(LEVELS[id]?.fastest).toBe(fastestKnown(id));
  });
});
