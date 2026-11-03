/**
 * Level loading from a `{ path: text }` map, the shape `import.meta.glob`
 * (raw text) produces render-side. Pure; reports problems as error values.
 * Level <-> solution pairing is repo policy (tests/levels/solvability.test.ts), not lane API.
 */
import type { Level, LoadLevelsFn } from '../types';
import { MAX_WORLD } from './limits';
import { parseLevel } from './parseLevel';
import { capErrors, inFile } from './text';

const SOLUTION_SUFFIX = '.solution.txt';
const LEVEL_SUFFIX = '.txt';
const LEVEL_STEM_RE = new RegExp('^w([0-' + MAX_WORLD + '])-[0-9]{2}$');

interface NamedFile {
  readonly path: string;
  readonly name: string;
  readonly text: string;
}

function baseName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] ?? path;
}

/** Files whose name ends with `suffix` and (when `excluding` is given) not with that, sorted by path. */
function filesEnding(files: Readonly<Record<string, string>>, suffix: string, excluding?: string): readonly NamedFile[] {
  return Object.keys(files)
    .sort()
    .map((path) => ({ path, name: baseName(path), text: files[path] ?? '' }))
    .filter((f) => f.name.endsWith(suffix) && !(excluding !== undefined && f.name.endsWith(excluding)));
}

function compareLevels(a: Level, b: Level): number {
  if (a.meta.world !== b.meta.world) return a.meta.world - b.meta.world;
  return a.meta.id < b.meta.id ? -1 : a.meta.id > b.meta.id ? 1 : 0;
}

/** Parses one level file and checks the file-name rules; returns the level or pushes errors. */
function loadOne(file: NamedFile, errors: string[]): Level | null {
  const stem = file.name.slice(0, -LEVEL_SUFFIX.length);
  const match = LEVEL_STEM_RE.exec(stem);
  if (!match) {
    errors.push(inFile(file.name, 'the file name must look like w<world>-<nn>.txt, for example w2-04.txt'));
    return null;
  }
  const parsed = parseLevel(file.text, stem);
  if (!parsed.ok) {
    errors.push(...parsed.errors);
    return null;
  }
  if (parsed.value.meta.world !== Number(match[1])) {
    errors.push(inFile(file.name, `the file name says world ${match[1]} but the header says world ${parsed.value.meta.world}`));
    return null;
  }
  return parsed.value;
}

export const loadLevels: LoadLevelsFn = (files) => {
  const errors: string[] = [];
  const levels: Level[] = [];
  const seen = new Map<string, string>();
  for (const file of filesEnding(files, LEVEL_SUFFIX, SOLUTION_SUFFIX)) {
    const earlier = seen.get(file.name);
    if (earlier !== undefined) {
      errors.push(inFile(file.name, `found twice (${earlier} and ${file.path}); level ids must be unique`));
      continue;
    }
    seen.set(file.name, file.path);
    const level = loadOne(file, errors);
    if (level) levels.push(level);
  }
  if (errors.length > 0) return { ok: false, errors: capErrors(errors) };
  return { ok: true, value: levels.sort(compareLevels) };
};
