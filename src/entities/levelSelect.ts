/**
 * Picks the level to play from the bundled files and the `?level=<id>` URL
 * parameter. Pure: the Vite glob lives in `levelFiles.ts` and is passed in.
 * Problems come back as messages for the scene to show on screen.
 *
 * Owner: gameplay-engineer [scene].
 */
import { loadLevels, type Level } from '../core';
import { devLevel } from './devLevel';

/** Level the grey-box milestone opens on when no `?level=` is given. */
export const DEFAULT_LEVEL_ID = 'w0-02';

export interface LevelSelection {
  readonly level: Level;
  /** Parse errors and fallback notices, one per line, for an on-screen overlay. */
  readonly messages: readonly string[];
}

/** The `level` query parameter, trimmed; null when absent or blank. */
export function requestedLevelId(search: string): string | null {
  const value = new URLSearchParams(search).get('level')?.trim();
  return value ? value : null;
}

export interface LoadedLevels {
  readonly levels: readonly Level[];
  readonly errors: readonly string[];
}

/**
 * Parse every file; one bad file must not hide the good ones. Tries the whole
 * set first, and only on failure re-parses file by file to salvage the rest.
 */
export function loadLevelSet(files: Readonly<Record<string, string>>): LoadedLevels {
  const all = loadLevels(files);
  if (all.ok) return { levels: all.value, errors: [] };
  const levels: Level[] = [];
  const errors: string[] = [];
  for (const path of Object.keys(files).sort()) {
    const one = loadLevels({ [path]: files[path] ?? '' });
    if (one.ok) levels.push(...one.value);
    else errors.push(...one.errors);
  }
  return { levels, errors: errors.length > 0 ? errors : all.errors };
}

/** Requested id, else the default, else the first level, else the built-in room. */
export function chooseLevel(
  levels: readonly Level[],
  requested: string | null,
  defaultId: string = DEFAULT_LEVEL_ID,
): LevelSelection {
  const byId = (id: string): Level | undefined => levels.find((l) => l.meta.id === id);
  const messages: string[] = [];
  if (requested !== null) {
    const hit = byId(requested);
    if (hit) return { level: hit, messages };
    messages.push(`Unknown level "${requested}" (?level=). Known: ${levels.map((l) => l.meta.id).join(', ') || 'none'}.`);
  }
  const fallback = byId(defaultId) ?? levels[0];
  if (fallback) return { level: fallback, messages };
  messages.push('No level files found in levels/. Playing the built-in dev room.');
  return { level: devLevel(), messages };
}

/** Everything the scene needs: files + URL search string in, a level and messages out. */
export function selectLevel(files: Readonly<Record<string, string>>, search: string): LevelSelection {
  const { levels, errors } = loadLevelSet(files);
  const choice = chooseLevel(levels, requestedLevelId(search));
  const parseNotes = errors.length > 0 ? ['Level files failed to parse:', ...errors] : [];
  return { level: choice.level, messages: [...parseNotes, ...choice.messages] };
}
