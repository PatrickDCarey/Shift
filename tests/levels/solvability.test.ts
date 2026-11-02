/// <reference types="vite/client" />
/**
 * Solvability (CLAUDE.md hard rule "every level ships with a solution
 * recording", architecture.md §6): every `levels/<id>.txt` has a
 * `levels/<id>.solution.txt` that the REAL sim replays to a win.
 *
 * Levels are loaded exactly as the game bundles them (architecture.md §7:
 * the same `import.meta.glob` raw-text map, passed to `loadLevels`), and
 * everything comes through the public `src/core` barrel. Pairing level <->
 * solution is a repo policy, so it lives here, per level (one test case each).
 * Passes with zero levels. Owner: tech-lead.
 */
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createSim,
  deriveParams,
  isTuning,
  loadLevels,
  parseSolution,
  step,
  tuningErrors,
  verifySolution,
  type Level,
  type SimApi,
  type SimParams,
} from '../../src/core';
import tuningJson from '../../src/data/tuning.json';

/** Same call as the game (architecture.md §7): level files only, raw text. */
const LEVEL_FILES = import.meta.glob(['/levels/*.txt', '!/levels/*.solution.txt'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const SOLUTION_FILES = import.meta.glob('/levels/*.solution.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const LEVELS_DIR = resolve(import.meta.dirname, '..', '..', 'levels');
const SOLUTION_SUFFIX = '.solution.txt';
const TXT_SUFFIX = '.txt';

const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path;

/** id -> text, keyed by file name minus `suffix`. */
function byStem(files: Readonly<Record<string, string>>, suffix: string): ReadonlyMap<string, string> {
  return new Map(Object.entries(files).map(([path, text]) => [baseName(path).slice(0, -suffix.length), text]));
}

function shippedParams(): SimParams {
  if (!isTuning(tuningJson)) throw new Error(`src/data/tuning.json is invalid:\n${tuningErrors(tuningJson).join('\n')}`);
  return deriveParams(tuningJson);
}

const sim: SimApi = { createSim, step };
const params = shippedParams();
const loaded = loadLevels(LEVEL_FILES);
const levels: readonly Level[] = loaded.ok ? loaded.value : [];
const solutions = byStem(SOLUTION_FILES, SOLUTION_SUFFIX);
const levelStems = new Set(byStem(LEVEL_FILES, TXT_SUFFIX).keys());

/** Everything wrong with one level's recording (`recordings`: id -> text); [] when the real sim wins with it. */
function solutionProblems(level: Level, recordings: ReadonlyMap<string, string>): readonly string[] {
  const id = level.meta.id;
  const text = recordings.get(id);
  if (text === undefined) {
    return [`${id}: no solution recording; add levels/${id}${SOLUTION_SUFFIX} (level-format.md §4)`];
  }
  const parsed = parseSolution(text, `${id}.solution`);
  if (!parsed.ok) return parsed.errors;
  return verifySolution(sim, level, params, parsed.value);
}

/** `*.txt` names on disk; the glob must see exactly these (guards against a vacuous pass). */
function txtFilesOnDisk(): readonly string[] {
  if (!existsSync(LEVELS_DIR)) return [];
  return readdirSync(LEVELS_DIR)
    .filter((name) => name.endsWith(TXT_SUFFIX))
    .sort();
}

describe('level solvability (real sim, shipped tuning)', () => {
  it('the bundler glob sees every levels/*.txt file on disk', () => {
    const globbed = [...Object.keys(LEVEL_FILES), ...Object.keys(SOLUTION_FILES)].map(baseName).sort();
    expect(globbed).toEqual(txtFilesOnDisk());
  });

  it('every level file parses', () => {
    expect(loaded.ok ? [] : loaded.errors).toEqual([]);
  });

  it('every solution file belongs to a level file', () => {
    const orphans = [...solutions.keys()]
      .filter((id) => !levelStems.has(id))
      .map((id) => `levels/${id}${SOLUTION_SUFFIX}: orphaned solution (there is no levels/${id}${TXT_SUFFIX})`);
    expect(orphans).toEqual([]);
  });

  for (const level of levels) {
    it(`${level.meta.id} is won by levels/${level.meta.id}${SOLUTION_SUFFIX}`, () => {
      expect(solutionProblems(level, solutions)).toEqual([]);
    });
  }
});

/** The checks above must fail loudly; prove it on an in-memory fixture (never on real levels). */
describe('solvability harness self-check', () => {
  const FIXTURE = ['id: w0-90', 'title: fixture', 'world: 0', 'teaches: harness self-check', 'version: 1', '---'];
  const fixture = loadLevels({ '/fixture/w0-90.txt': [...FIXTURE, '.......', '.@..E..', '#######'].join('\n') });
  const level = fixture.ok ? fixture.value[0] : undefined;
  const recording = (version: number, runs: string): ReadonlyMap<string, string> =>
    new Map([['w0-90', ['level: w0-90', `levelVersion: ${version}`, 'steps: 60', '---', runs].join('\n')]]);

  it('loads the fixture', () => {
    expect(fixture.ok ? [] : fixture.errors).toEqual([]);
    expect(level).toBeDefined();
  });

  it.runIf(level !== undefined)('passes a winning recording and names every failure', () => {
    const fx = level as Level;
    expect(solutionProblems(fx, recording(1, '60R'))).toEqual([]);
    expect(solutionProblems(fx, new Map()).join()).toContain('no solution recording');
    expect(solutionProblems(fx, recording(1, '60.')).join()).toContain('did not win');
    expect(solutionProblems(fx, recording(2, '60R')).join()).toContain('version');
    expect(solutionProblems(fx, recording(1, '59R')).join()).toContain('steps');
  });
});
