import { describe, expect, it } from 'vitest';
import { EMPTY_INPUT, INPUT_BUTTONS, type InputFrame, type ParseResult, type Solution } from '../types';
import { encodeRuns, formatSolution, parseSolution } from './index';

/** Copied from docs/tech/level-format.md section 4 (the doc itself stays untouched). */
const DOC_EXAMPLE = [
  'level: w0-01',
  'levelVersion: 1',
  '# Hold right from the first step: gear 1 walks at 3 tiles/s straight to the exit.',
  'steps: 323',
  '---',
  '323R',
  '',
].join('\n');

const STEM = 'w0-01.solution';

function ok(result: ParseResult<Solution>): Solution {
  if (!result.ok) throw new Error(`expected ok, got errors:\n${result.errors.join('\n')}`);
  return result.value;
}

function errors(result: ParseResult<Solution>): readonly string[] {
  if (result.ok) throw new Error('expected errors, got a solution');
  return result.errors;
}

function solutionText(steps: number, body: readonly string[], extraHeader: readonly string[] = []): string {
  return ['level: w0-01', 'levelVersion: 1', `steps: ${steps}`, ...extraHeader, '---', ...body, ''].join('\n');
}

const R: InputFrame = { ...EMPTY_INPUT, right: true };

describe('parseSolution: the documented example', () => {
  it('parses to one run of 323 right frames', () => {
    expect(ok(parseSolution(DOC_EXAMPLE, STEM))).toEqual({
      levelId: 'w0-01',
      levelVersion: 1,
      steps: 323,
      runs: [{ count: 323, frame: R }],
    });
  });

  it('parses CRLF, BOM and BOM+CRLF identically', () => {
    const reference = ok(parseSolution(DOC_EXAMPLE, STEM));
    expect(ok(parseSolution(DOC_EXAMPLE.replace(/\n/g, '\r\n'), STEM))).toEqual(reference);
    expect(ok(parseSolution(`﻿${DOC_EXAMPLE}`, STEM))).toEqual(reference);
    expect(ok(parseSolution(`﻿${DOC_EXAMPLE.replace(/\n/g, '\r\n')}`, STEM))).toEqual(reference);
  });

  it('does not let a carriage return into a run token', () => {
    const text = solutionText(3, ['1R+', '2R']).replace(/\n/g, '\r\n');
    expect(ok(parseSolution(text, STEM)).runs).toHaveLength(2);
  });

  it('also accepts a stem without the .solution suffix', () => {
    ok(parseSolution(DOC_EXAMPLE, 'w0-01'));
  });
});

describe('parseSolution: runs section', () => {
  it('accepts tokens wrapped over several lines and separated by any whitespace', () => {
    const text = solutionText(7, ['1R+ 40R\t', '', '   2.  ']).replace('steps: 7', 'steps: 43');
    const s = ok(parseSolution(text, STEM));
    expect(s.runs.map((r) => r.count)).toEqual([1, 40, 2]);
  });

  it('keeps unmerged adjacent tokens as written', () => {
    const s = ok(parseSolution(solutionText(3, ['1R 2R']), STEM));
    expect(s.runs).toHaveLength(2);
  });

  it('reports malformed tokens with line and column', () => {
    const e = errors(parseSolution(solutionText(8, ['3R  2RL', '3x 3R']), STEM));
    expect(e).toEqual([
      "w0-01.solution.txt:5:5: malformed run token '2RL': buttons must appear at most once, in the order L R J + - !",
      "w0-01.solution.txt:6:1: malformed run token '3x': unknown button 'x' (use L R J + - ! or '.')",
    ]);
  });

  it('points a comment in the run section at the header', () => {
    const e = errors(parseSolution(solutionText(1, ['# hmm', '1R']), STEM));
    expect(e[0]).toBe("w0-01.solution.txt:5:1: comments are only allowed in the header, not after the '---' line");
  });

  it('rejects a second --- line in the runs', () => {
    const e = errors(parseSolution(solutionText(1, ['1R', '---']), STEM));
    expect(e).toContain("w0-01.solution.txt:6:1: a second '---' is not allowed in the runs");
  });

  it('rejects an empty run section', () => {
    expect(errors(parseSolution(solutionText(1, []), STEM))).toContain(
      'w0-01.solution.txt:4:1: no run tokens after the --- line',
    );
  });

  it('rejects steps that do not equal the sum of the run counts', () => {
    const e = errors(parseSolution(solutionText(10, ['4R 5.']), STEM));
    expect(e).toEqual(['w0-01.solution.txt:3:8: steps says 10 but the runs add up to 9']);
  });

  it('rejects a solution longer than the step cap', () => {
    const e = errors(parseSolution(solutionText(1_500_000, ['1000000R 500000R']), STEM));
    expect(e).toEqual(['w0-01.solution.txt:5:1: the runs add up to 1500000 steps; a solution has at most 1000000']);
  });
});

describe('parseSolution: header', () => {
  it('accepts comments, blank lines and any key order', () => {
    const text = ['# c', 'steps: 2', '', 'levelVersion: 4', 'level: w0-01', '---', '2R'].join('\n');
    expect(ok(parseSolution(text, STEM))).toMatchObject({ levelId: 'w0-01', levelVersion: 4, steps: 2 });
  });

  it('requires the level id to match the file stem', () => {
    const text = solutionText(1, ['1R']).replace('level: w0-01', 'level: w0-02');
    expect(errors(parseSolution(text, STEM))).toEqual(["w0-01.solution.txt:1:8: level 'w0-02' must equal the file name 'w0-01'"]);
  });

  it('reports each missing key at the --- line', () => {
    const e = errors(parseSolution('level: w0-01\n---\n1R', STEM));
    expect(e).toEqual([
      "w0-01.solution.txt:2:1: missing required header key 'levelVersion'",
      "w0-01.solution.txt:2:1: missing required header key 'steps'",
    ]);
  });

  it('rejects unknown keys with a suggestion', () => {
    const e = errors(parseSolution(solutionText(1, ['1R'], ['levelversion: 1']), STEM));
    expect(e[0]).toContain("w0-01.solution.txt:4:1: unknown header key 'levelversion'");
    expect(e[0]).toContain("did you mean 'levelVersion'?");
  });

  it.each([
    ['levelVersion: 0', 'levelVersion must be an integer of at least 1'],
    ['levelVersion: v2', 'levelVersion must be an integer of at least 1'],
    ['steps: 0', 'steps must be an integer of at least 1'],
    ['steps: many', 'steps must be an integer of at least 1'],
  ])('rejects %s', (line, message) => {
    const key = line.split(':')[0] ?? '';
    const text = solutionText(1, ['1R']).split('\n').map((l) => (l.startsWith(`${key}:`) ? line : l)).join('\n');
    const e = errors(parseSolution(text, STEM));
    expect(e[0]).toMatch(/^w0-01\.solution\.txt:\d+:\d+: /);
    expect(e[0]).toContain(message);
  });

  it('rejects a missing --- separator', () => {
    expect(errors(parseSolution('level: w0-01\nlevelVersion: 1\nsteps: 1', STEM))).toEqual([
      "w0-01.solution.txt: missing the '---' line that ends the header and starts the runs",
    ]);
  });
});

function randomSolution(seed: number): Solution {
  let s = seed >>> 0;
  const next = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const frames: InputFrame[] = [];
  const stretches = 1 + Math.floor(next() * 60);
  for (let i = 0; i < stretches; i++) {
    const bits = Math.floor(next() * 64);
    const frame = Object.fromEntries(INPUT_BUTTONS.map((b, k) => [b, ((bits >> k) & 1) === 1])) as unknown as InputFrame;
    const length = 1 + Math.floor(next() * (next() < 0.3 ? 900 : 4));
    for (let k = 0; k < length; k++) frames.push(frame);
  }
  return { levelId: 'w0-01', levelVersion: 1 + Math.floor(next() * 9), steps: frames.length, runs: encodeRuns(frames) };
}

describe('formatSolution', () => {
  it('writes the documented example in canonical form', () => {
    const solution: Solution = { levelId: 'w0-01', levelVersion: 1, steps: 323, runs: [{ count: 323, frame: R }] };
    expect(formatSolution(solution)).toBe('level: w0-01\nlevelVersion: 1\nsteps: 323\n---\n323R\n');
  });

  it('merges adjacent runs with identical buttons', () => {
    const solution: Solution = {
      levelId: 'w0-01',
      levelVersion: 1,
      steps: 6,
      runs: [
        { count: 1, frame: R },
        { count: 2, frame: R },
        { count: 3, frame: EMPTY_INPUT },
      ],
    };
    expect(formatSolution(solution)).toContain('\n---\n3R 3.\n');
  });

  it('uses LF only and wraps long run lists at 80 columns', () => {
    const runs = Array.from({ length: 200 }, (_, i) => ({ count: 1 + (i % 7), frame: i % 2 === 0 ? R : EMPTY_INPUT }));
    const steps = runs.reduce((n, r) => n + r.count, 0);
    const text = formatSolution({ levelId: 'w0-01', levelVersion: 2, steps, runs });
    expect(text).not.toContain('\r');
    expect(text.endsWith('\n')).toBe(true);
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(10);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(80);
    expect(ok(parseSolution(text, STEM)).steps).toBe(steps);
  });

  it('round-trips 200 generated solutions through parseSolution', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const original = randomSolution(seed);
      const text = formatSolution(original);
      expect(ok(parseSolution(text, STEM))).toEqual(original);
      expect(formatSolution(ok(parseSolution(text, STEM)))).toBe(text);
    }
  });

  it('canonicalises a hand-written solution with split runs', () => {
    const parsed = ok(parseSolution(solutionText(6, ['1R 2R 3.']), STEM));
    const again = ok(parseSolution(formatSolution(parsed), STEM));
    expect(again.runs).toEqual([
      { count: 3, frame: R },
      { count: 3, frame: EMPTY_INPUT },
    ]);
  });
});
