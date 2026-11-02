/**
 * Solution file parser and formatter (docs/tech/level-format.md section 4).
 * Header `level`, `levelVersion`, `steps`, then `---`, then whitespace-separated
 * run tokens. Errors read `w1-01.solution.txt:6:5: message`.
 */
import type { FormatSolutionFn, InputRun, ParseSolutionFn, Solution } from '../types';
import { mergeRuns } from './codec';
import { MAX_REPLAY_STEPS } from './limits';
import {
  atPos,
  capErrors,
  inFile,
  isSeparator,
  missingKeyErrors,
  parseWholeNumber,
  readHeader,
  splitLines,
  splitSections,
  type HeaderEntry,
  type SourceLine,
} from './text';
import { formatRunToken, parseRunToken } from './tokens';

const REQUIRED_KEYS = ['level', 'levelVersion', 'steps'] as const;
const FORMAT_LINE_WIDTH = 80;

interface Header {
  readonly levelId: string;
  readonly levelVersion: number;
  readonly steps: number;
  readonly stepsEntry: HeaderEntry | undefined;
}

function readAtLeastOne(file: string, key: string, e: HeaderEntry | undefined, errors: string[]): number {
  if (!e) return 0;
  const n = parseWholeNumber(e.value);
  if (n === null || n < 1) {
    errors.push(atPos(file, e.line, e.valueCol, `${key} must be an integer of at least 1, found '${e.value}'`));
    return 0;
  }
  return n;
}

function parseHeader(file: string, expectedId: string, lines: readonly SourceLine[], sepLine: number, errors: string[]): Header {
  const { entries, errors: lineErrors } = readHeader(file, lines, REQUIRED_KEYS);
  errors.push(...lineErrors, ...missingKeyErrors(file, entries, REQUIRED_KEYS, sepLine));
  const level = entries.get('level');
  if (level && level.value !== expectedId) {
    errors.push(atPos(file, level.line, level.valueCol, `level '${level.value}' must equal the file name '${expectedId}'`));
  }
  const stepsEntry = entries.get('steps');
  return {
    levelId: level?.value ?? '',
    levelVersion: readAtLeastOne(file, 'levelVersion', entries.get('levelVersion'), errors),
    steps: readAtLeastOne(file, 'steps', stepsEntry, errors),
    stepsEntry,
  };
}

/** Reads every token of the run section; pushes errors and returns the runs that parsed. */
function parseRuns(file: string, body: readonly SourceLine[], errors: string[]): readonly InputRun[] {
  const runs: InputRun[] = [];
  for (const line of body) {
    if (isSeparator(line)) {
      errors.push(atPos(file, line.no, 1, "a second '---' is not allowed in the runs"));
      continue;
    }
    for (const m of line.text.matchAll(/\S+/g)) {
      const token = m[0];
      const col = m.index + 1;
      if (token.startsWith('#')) {
        errors.push(atPos(file, line.no, col, "comments are only allowed in the header, not after the '---' line"));
        break;
      }
      const result = parseRunToken(token);
      if (result.ok) runs.push(result.run);
      else errors.push(atPos(file, line.no, col, result.message));
    }
  }
  return runs;
}

function checkTotals(file: string, header: Header, runs: readonly InputRun[], body: readonly SourceLine[], sepLine: number, errors: string[]): void {
  if (errors.length > 0) return;
  if (runs.length === 0) {
    errors.push(atPos(file, sepLine, 1, 'no run tokens after the --- line'));
    return;
  }
  const total = runs.reduce((sum, r) => sum + r.count, 0);
  if (total > MAX_REPLAY_STEPS) {
    const first = body.find((l) => l.text.trim() !== '')?.no ?? sepLine;
    errors.push(atPos(file, first, 1, `the runs add up to ${total} steps; a solution has at most ${MAX_REPLAY_STEPS}`));
  } else if (header.stepsEntry && total !== header.steps) {
    const { line, valueCol } = header.stepsEntry;
    errors.push(atPos(file, line, valueCol, `steps says ${header.steps} but the runs add up to ${total}`));
  }
}

export const parseSolution: ParseSolutionFn = (text, fileStem) => {
  const file = `${fileStem}.txt`;
  const expectedId = fileStem.endsWith('.solution') ? fileStem.slice(0, -'.solution'.length) : fileStem;
  const sections = splitSections(splitLines(text));
  if (sections.separatorLine === null) {
    return { ok: false, errors: [inFile(file, "missing the '---' line that ends the header and starts the runs")] };
  }
  const errors: string[] = [];
  const header = parseHeader(file, expectedId, sections.header, sections.separatorLine, errors);
  const runs = parseRuns(file, sections.body, errors);
  checkTotals(file, header, runs, sections.body, sections.separatorLine, errors);
  if (errors.length > 0) return { ok: false, errors: capErrors(errors) };
  return { ok: true, value: { levelId: header.levelId, levelVersion: header.levelVersion, steps: header.steps, runs } };
};

/** Greedy wrap of tokens into lines of at most FORMAT_LINE_WIDTH columns. */
function wrapTokens(tokens: readonly string[]): readonly string[] {
  const lines: string[] = [];
  let current = '';
  for (const token of tokens) {
    if (current !== '' && current.length + 1 + token.length > FORMAT_LINE_WIDTH) {
      lines.push(current);
      current = token;
    } else {
      current = current === '' ? token : `${current} ${token}`;
    }
  }
  return current === '' ? lines : [...lines, current];
}

export const formatSolution: FormatSolutionFn = (solution: Solution) => {
  const tokens = mergeRuns(solution.runs).map(formatRunToken);
  const header = [`level: ${solution.levelId}`, `levelVersion: ${solution.levelVersion}`, `steps: ${solution.steps}`, '---'];
  return `${[...header, ...wrapTokens(tokens)].join('\n')}\n`;
};
