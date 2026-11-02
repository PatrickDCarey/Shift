import { describe, expect, it } from 'vitest';
import type { Level, ParseResult } from '../types';
import { loadLevels } from './index';
import { pairSolutions } from './loadLevels';

function levelText(id: string, world: number, grid: readonly string[] = ['@E']): string {
  return [`id: ${id}`, `title: Level ${id}`, `world: ${world}`, 'teaches: t', 'version: 1', '---', ...grid, ''].join('\n');
}

function solutionText(id: string, steps = 1): string {
  return [`level: ${id}`, 'levelVersion: 1', `steps: ${steps}`, '---', `${steps}R`, ''].join('\n');
}

function levels(result: ParseResult<readonly Level[]>): readonly Level[] {
  if (!result.ok) throw new Error(`expected ok, got errors:\n${result.errors.join('\n')}`);
  return result.value;
}

function errors<T>(result: ParseResult<T>): readonly string[] {
  if (result.ok) throw new Error('expected errors');
  return result.errors;
}

describe('loadLevels', () => {
  it('parses every file of a glob-style map and sorts by world, then id', () => {
    const files = {
      '/levels/w2-01.txt': levelText('w2-01', 2),
      '/levels/w1-10.txt': levelText('w1-10', 1),
      '/levels/w0-01.txt': levelText('w0-01', 0),
      '/levels/w1-02.txt': levelText('w1-02', 1),
    };
    expect(levels(loadLevels(files)).map((l) => l.meta.id)).toEqual(['w0-01', 'w1-02', 'w1-10', 'w2-01']);
  });

  it('gives the same order whatever the key order of the map', () => {
    const entries = [
      ['/levels/w1-02.txt', levelText('w1-02', 1)],
      ['/levels/w1-01.txt', levelText('w1-01', 1)],
    ] as const;
    const a = levels(loadLevels(Object.fromEntries(entries)));
    const b = levels(loadLevels(Object.fromEntries([...entries].reverse())));
    expect(a).toEqual(b);
  });

  it('ignores *.solution.txt files', () => {
    const files = {
      '/levels/w1-01.txt': levelText('w1-01', 1),
      '/levels/w1-01.solution.txt': solutionText('w1-01'),
    };
    expect(levels(loadLevels(files))).toHaveLength(1);
  });

  it('ignores files that are not .txt and accepts Windows separators and bare names', () => {
    const files = {
      'levels\\w1-01.txt': levelText('w1-01', 1),
      'w1-02.txt': levelText('w1-02', 1),
      '/levels/README.md': '# notes',
    };
    expect(levels(loadLevels(files)).map((l) => l.meta.id)).toEqual(['w1-01', 'w1-02']);
  });

  it('returns an empty list for an empty map', () => {
    expect(levels(loadLevels({}))).toEqual([]);
  });

  it('accepts CRLF files', () => {
    const files = { '/levels/w1-01.txt': levelText('w1-01', 1).replace(/\n/g, '\r\n') };
    expect(levels(loadLevels(files))[0]?.meta.id).toBe('w1-01');
  });

  it('collects parse errors from every bad file with the file name in each', () => {
    const files = {
      '/levels/w1-01.txt': levelText('w1-01', 1, ['@Q']),
      '/levels/w1-02.txt': levelText('w1-03', 1),
      '/levels/w1-03.txt': levelText('w1-03', 1),
    };
    const e = errors(loadLevels(files));
    expect(e).toHaveLength(3);
    expect(e[0]).toMatch(/^w1-01\.txt:7:2: unknown tile character 'Q'/);
    expect(e[1]).toMatch(/^w1-01\.txt:7:1: no exit 'E'/);
    expect(e[2]).toBe("w1-02.txt:1:5: id 'w1-03' must equal the file name 'w1-02'");
  });

  it.each(['level1', 'w1-1', 'w6-01', 'w1-001', 'W1-01', 'w1-01b'])('rejects the file name %s', (stem) => {
    const e = errors(loadLevels({ [`/levels/${stem}.txt`]: levelText(stem, 1) }));
    expect(e).toContain(`${stem}.txt: the file name must look like w<world>-<nn>.txt, for example w2-04.txt`);
  });

  it('rejects a header world that disagrees with the file name', () => {
    const e = errors(loadLevels({ '/levels/w2-04.txt': levelText('w2-04', 3) }));
    expect(e).toEqual(['w2-04.txt: the file name says world 2 but the header says world 3']);
  });

  it('rejects the same file name in two folders', () => {
    const e = errors(
      loadLevels({ '/levels/w1-01.txt': levelText('w1-01', 1), '/more/w1-01.txt': levelText('w1-01', 1) }),
    );
    expect(e).toEqual(["w1-01.txt: found twice (/levels/w1-01.txt and /more/w1-01.txt); level ids must be unique"]);
  });
});

describe('pairSolutions', () => {
  const lvls = (ids: readonly string[]): readonly Level[] =>
    levels(loadLevels(Object.fromEntries(ids.map((id) => [`/levels/${id}.txt`, levelText(id, Number(id[1]))]))));

  it('pairs each level with the solution of the same id', () => {
    const result = pairSolutions(lvls(['w1-01', 'w1-02']), {
      '/levels/w1-01.solution.txt': solutionText('w1-01', 3),
      '/levels/w1-02.solution.txt': solutionText('w1-02', 4),
    });
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect([...result.value.keys()]).toEqual(['w1-01', 'w1-02']);
    expect(result.value.get('w1-02')?.steps).toBe(4);
  });

  it('reports a level without a solution as missing', () => {
    const e = errors(pairSolutions(lvls(['w1-01', 'w1-02']), { '/levels/w1-01.solution.txt': solutionText('w1-01') }));
    expect(e).toEqual(["w1-02: no solution recording (expected levels/w1-02.solution.txt; every level ships with one)"]);
  });

  it('reports a solution without a level as orphaned', () => {
    const e = errors(
      pairSolutions(lvls(['w1-01']), {
        '/levels/w1-01.solution.txt': solutionText('w1-01'),
        '/levels/w1-09.solution.txt': solutionText('w1-09'),
      }),
    );
    expect(e).toEqual(["w1-09.solution.txt: orphaned solution (there is no level 'w1-09')"]);
  });

  it('reports a solution file that does not parse, with its name and position', () => {
    const e = errors(pairSolutions(lvls(['w1-01']), { '/levels/w1-01.solution.txt': 'level: w1-01\n---\n1R' }));
    expect(e[0]).toBe("w1-01.solution.txt:2:1: missing required header key 'levelVersion'");
  });

  it('ignores plain level files and unrelated names in the map', () => {
    const result = pairSolutions(lvls(['w1-01']), {
      '/levels/w1-01.txt': levelText('w1-01', 1),
      '/levels/w1-01.solution.txt': solutionText('w1-01'),
      '/levels/notes.md': 'x',
    });
    expect(result.ok).toBe(true);
  });

  it('parses CRLF solutions', () => {
    const result = pairSolutions(lvls(['w1-01']), {
      '/levels/w1-01.solution.txt': solutionText('w1-01').replace(/\n/g, '\r\n'),
    });
    expect(result.ok).toBe(true);
  });
});
