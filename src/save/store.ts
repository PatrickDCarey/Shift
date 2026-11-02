/**
 * The save store: settings and progress, loaded once, persisted on change.
 *
 * Snapshots returned by the getters are never mutated afterwards; every
 * change produces new objects.
 *
 * Owner: ui-engineer.
 */
import { buildSave, isValidLevelId, isValidSteps, parseSave, sanitizeSettings, serializeSave } from './schema';
import type { Progress, SaveData, Settings } from './schema';
import { createSafeStorage } from './storage';
import type { SafeStorage } from './storage';

/** Single storage key; the whole save is one JSON document. */
export const SAVE_KEY = 'redshift.save';

export interface LevelResult {
  /** False when the id or step count was invalid and nothing was recorded. */
  readonly recorded: boolean;
  /** True when this run is the first completion or beat the previous best. */
  readonly newBest: boolean;
  /** Best step count after this call, if any. */
  readonly best: number | null;
}

export interface SaveStore {
  getSettings(): Settings;
  getProgress(): Progress;
  getSnapshot(): SaveData;
  /** Merge a partial settings change; invalid values are ignored field by field. */
  updateSettings(patch: Partial<Settings>): Settings;
  /** Record a finished level (marks it completed, keeps the lowest step count). */
  recordLevelComplete(levelId: string, steps: number): LevelResult;
  isLevelCompleted(levelId: string): boolean;
  getBestSteps(levelId: string): number | null;
  markStickyKeysTipShown(): void;
  /** Wipe settings and progress back to defaults. */
  reset(): void;
  /** False when saves only live in memory for this session. */
  isPersistent(): boolean;
}

export function createSaveStore(storage: SafeStorage = createSafeStorage()): SaveStore {
  let data: SaveData = parseSave(storage.get(SAVE_KEY));

  const commit = (next: SaveData): void => {
    data = next;
    storage.set(SAVE_KEY, serializeSave(next));
  };

  const bestFor = (levelId: string): number | null =>
    Object.prototype.hasOwnProperty.call(data.progress.bestSteps, levelId)
      ? (data.progress.bestSteps[levelId] ?? null)
      : null;

  return {
    getSettings: () => data.settings,
    getProgress: () => data.progress,
    getSnapshot: () => data,

    updateSettings(patch) {
      commit(buildSave(sanitizeSettings({ ...data.settings, ...patch }, data.settings), data.progress));
      return data.settings;
    },

    recordLevelComplete(levelId, steps) {
      if (!isValidLevelId(levelId) || !isValidSteps(steps)) {
        return { recorded: false, newBest: false, best: bestFor(levelId) };
      }
      const previous = data.progress.bestSteps[levelId];
      const newBest = previous === undefined || steps < previous;
      const best = newBest ? steps : (previous ?? steps);
      const completedLevels = data.progress.completedLevels.includes(levelId)
        ? data.progress.completedLevels
        : [...data.progress.completedLevels, levelId];
      const bestSteps = newBest ? { ...data.progress.bestSteps, [levelId]: steps } : data.progress.bestSteps;
      commit(buildSave(data.settings, { completedLevels, bestSteps }));
      return { recorded: true, newBest, best };
    },

    isLevelCompleted: (levelId) => data.progress.completedLevels.includes(levelId),

    getBestSteps: bestFor,

    markStickyKeysTipShown() {
      if (!data.settings.stickyKeysTipShown) {
        commit(buildSave({ ...data.settings, stickyKeysTipShown: true }, data.progress));
      }
    },

    reset() {
      storage.remove(SAVE_KEY);
      data = parseSave(null);
    },

    isPersistent: () => storage.isPersistent(),
  };
}
