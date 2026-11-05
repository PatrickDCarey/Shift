/// <reference types="vite/client" />
/**
 * The shipped levels, recordings, tuning and sim, loaded exactly as the game
 * bundles them (architecture.md §7: the same `import.meta.glob` raw-text map,
 * passed to `loadLevels`), for the tests in this folder. Everything comes
 * through the public `src/core` barrel. Owner: tech-lead.
 */
import {
  createSim,
  deriveParams,
  isTuning,
  loadLevels,
  step,
  tuningErrors,
  type Level,
  type SimApi,
  type SimParams,
} from '../../src/core';
import tuningJson from '../../src/data/tuning.json';

/** Same call as the game (architecture.md §7): level files only, raw text. */
export const LEVEL_FILES = import.meta.glob(['/levels/*.txt', '!/levels/*.solution.txt'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const SOLUTION_FILES = import.meta.glob('/levels/*.solution.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const SOLUTION_SUFFIX = '.solution.txt';
export const TXT_SUFFIX = '.txt';

export const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path;

/** id -> text, keyed by file name minus `suffix`. */
export function byStem(files: Readonly<Record<string, string>>, suffix: string): ReadonlyMap<string, string> {
  return new Map(Object.entries(files).map(([path, text]) => [baseName(path).slice(0, -suffix.length), text]));
}

function shippedParams(): SimParams {
  if (!isTuning(tuningJson)) throw new Error(`src/data/tuning.json is invalid:\n${tuningErrors(tuningJson).join('\n')}`);
  return deriveParams(tuningJson);
}

export const sim: SimApi = { createSim, step };
export const params = shippedParams();
export const loaded = loadLevels(LEVEL_FILES);
export const levels: readonly Level[] = loaded.ok ? loaded.value : [];
/** Recording text per level id. */
export const solutions = byStem(SOLUTION_FILES, SOLUTION_SUFFIX);
